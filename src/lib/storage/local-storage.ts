/**
 * Local Filesystem Storage Implementation
 * Stores files in the local filesystem (uploads directory)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage-service';
import { ImageOptimizationService } from '../services/image-optimization-service';
import { logger } from '../logger';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export class LocalStorage implements StorageService {
  private baseDir: string;

  constructor(baseDir: string = UPLOAD_DIR) {
    this.baseDir = baseDir;
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async upload(
    file: File | Buffer,
    folder: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const folderPath = path.join(this.baseDir, folder);
    await this.ensureDir(folderPath);

    // Get file extension
    let extension = '.jpg';
    if (file instanceof File) {
      const originalExt = path.extname(file.name).toLowerCase();
      extension = originalExt || '.jpg';
    }

    // Generate unique filename
    const filename = `${uuidv4()}${extension}`;
    const filepath = path.join(folderPath, filename);

    // Convert to buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      buffer = file;
    }

    // Optimize image if it's an image file
    if (file instanceof File && file.type.startsWith('image/')) {
      try {
        const originalSize = buffer.length;
        buffer = await ImageOptimizationService.optimizeReceiptImage(buffer);
        const optimizedSize = buffer.length;
        const saved = originalSize - optimizedSize;
        logger.info('Image optimized before storage', {
          filename: file.name,
          originalSize,
          optimizedSize,
          saved: `${(saved / 1024).toFixed(2)} KB`,
        });
      } catch (error) {
        logger.warn('Image optimization failed, using original', { error });
        // Continue with original buffer if optimization fails
      }
    }

    // Write file
    await fs.writeFile(filepath, buffer);

    // Return relative URL
    return `/uploads/${folder}/${filename}`;
  }

  async delete(url: string): Promise<void> {
    try {
      // Remove /uploads/ prefix
      const relativePath = url.replace(/^\/uploads\//, '');
      const filepath = path.join(this.baseDir, relativePath);
      await fs.unlink(filepath);
    } catch (error) {
      logger.warn('Failed to delete local file', { url, error });
      // Don't throw - file might not exist
    }
  }

  async getLocalPath(url: string): Promise<string> {
    // Remove /uploads/ prefix
    const relativePath = url.replace(/^\/uploads\//, '');
    return path.join(this.baseDir, relativePath);
  }

  isUrlFromStorage(url: string): boolean {
    return url.startsWith('/uploads/');
  }
}

