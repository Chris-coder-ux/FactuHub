/**
 * Local Filesystem Storage Implementation
 * Stores files in the local filesystem (uploads directory)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage-service';

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
      console.warn('Failed to delete local file:', error);
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

