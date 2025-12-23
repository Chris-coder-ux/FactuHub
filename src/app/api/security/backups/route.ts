import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { logger } from '@/lib/logger';

/**
 * GET /api/security/backups
 * List available backups
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const backupDir = process.env.BACKUP_OUTPUT_DIR || './backups';

    try {
      const files = await readdir(backupDir);
      const backupFiles = files.filter((file) => file.endsWith('.encrypted'));

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = join(backupDir, file);
          const stats = await stat(filePath);
          return {
            filename: file,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
      );

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return NextResponse.json({
        success: true,
        backups,
        backupDir,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist yet
        return NextResponse.json({
          success: true,
          backups: [],
          backupDir,
          message: 'Backup directory does not exist yet. Create a backup first.',
        });
      }

      throw error;
    }
  } catch (error: any) {
    logger.error('List backups error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/backups
 * Trigger backup creation (only in development or with explicit permission)
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    // Only allow in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RUNTIME_BACKUP !== 'true') {
      return NextResponse.json(
        {
          error: 'Runtime backup creation is disabled in production for security reasons. Use scheduled backups or scripts instead.',
        },
        { status: 403 }
      );
    }

    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI is not configured' },
        { status: 400 }
      );
    }

    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: 'ENCRYPTION_KEY is not configured' },
        { status: 400 }
      );
    }

    // Import and run backup script
    try {
      const { createBackup } = await import('@/../../scripts/backup-database');
      await createBackup();

      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
      });
    } catch (error: any) {
      logger.error('Backup creation failed', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Backup creation failed',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Create backup error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

