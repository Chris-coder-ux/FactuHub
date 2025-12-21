/**
 * Cron job for storage cleanup
 * Removes old unused files and optimizes storage
 * 
 * Security: Requires CRON_SECRET to be passed in Authorization header
 * Schedule: Run daily (0 2 * * *) - 2 AM daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import { promises as fs } from 'fs';
import path from 'path';
import { getStorageService } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const startTime = Date.now();
    logger.info('Starting storage cleanup');

    const results = {
      timestamp: new Date().toISOString(),
      filesDeleted: 0,
      storageFreed: 0,
      errors: [] as string[],
    };

    // 1. Clean up orphaned local files (files not referenced in database)
    try {
      const storage = getStorageService();
      if (storage.constructor.name === 'LocalStorage') {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
        
        try {
          const files = await fs.readdir(uploadsDir);
          const receipts = await Receipt.find({}).select('imageUrl').lean();
          const validUrls = new Set(
            receipts
              .map(r => r.imageUrl)
              .filter(url => url.startsWith('/uploads/'))
              .map(url => url.replace('/uploads/receipts/', ''))
          );

          for (const file of files) {
            if (!validUrls.has(file)) {
              const filePath = path.join(uploadsDir, file);
              try {
                const stats = await fs.stat(filePath);
                // Only delete files older than 30 days
                const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
                if (stats.mtimeMs < thirtyDaysAgo) {
                  await fs.unlink(filePath);
                  results.filesDeleted++;
                  results.storageFreed += stats.size;
                }
              } catch (error) {
                results.errors.push(`Failed to delete ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            results.errors.push(`Failed to read uploads directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      results.errors.push(`Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Storage cleanup error', error);
    }

    // 2. Clean up old failed receipts (older than 90 days)
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const oldFailedReceipts = await Receipt.find({
        status: 'failed',
        createdAt: { $lt: ninetyDaysAgo },
      }).lean();

      for (const receipt of oldFailedReceipts) {
        try {
          const storage = getStorageService();
          await storage.delete(receipt.imageUrl);
          await Receipt.findByIdAndDelete(receipt._id);
          results.filesDeleted++;
        } catch (error) {
          results.errors.push(`Failed to delete receipt ${receipt._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      results.errors.push(`Failed receipts cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error('Failed receipts cleanup error', error);
    }

    // 3. Clean up temp files (CloudinaryStorage)
    try {
      const storage = getStorageService();
      if (storage.constructor.name === 'CloudinaryStorage' && 'cleanupTempFiles' in storage) {
        await (storage as any).cleanupTempFiles();
      }
    } catch (error) {
      logger.warn('Temp files cleanup error', error);
    }

    const duration = Date.now() - startTime;
    logger.info('Storage cleanup completed', {
      duration: `${duration}ms`,
      filesDeleted: results.filesDeleted,
      storageFreed: `${(results.storageFreed / 1024 / 1024).toFixed(2)} MB`,
    });

    return NextResponse.json({
      success: true,
      ...results,
      storageFreedMB: (results.storageFreed / 1024 / 1024).toFixed(2),
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error('Storage cleanup cron error', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

