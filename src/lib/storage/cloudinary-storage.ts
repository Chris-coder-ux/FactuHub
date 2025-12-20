/**
 * Cloudinary Storage Implementation
 * Stores files in Cloudinary cloud storage with CDN
 */

import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';
import { StorageService } from './storage-service';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export class CloudinaryStorage implements StorageService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Ignore if already exists
    }
  }

  async upload(
    file: File | Buffer,
    folder: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }

    // Convert to buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      buffer = file;
    }

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `receipts/${folder}`,
          resource_type: 'image',
          format: 'auto', // Auto-optimize format
          quality: 'auto', // Auto-optimize quality
          fetch_format: 'auto',
          // Add metadata
          context: metadata ? JSON.stringify(metadata) : undefined,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
            return;
          }
          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
            return;
          }
          // Return secure URL
          resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    });
  }

  async delete(url: string): Promise<void> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary not configured, skipping delete');
      return;
    }

    try {
      // Extract public_id from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL');
      }

      // Get public_id (everything after upload/version/)
      const afterUpload = urlParts.slice(uploadIndex + 1);
      const version = afterUpload[0];
      const publicIdWithFormat = afterUpload.slice(1).join('/');
      
      // Remove file extension for public_id
      const publicId = publicIdWithFormat.replace(/\.[^.]+$/, '');

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.warn('Failed to delete from Cloudinary:', error);
      // Don't throw - file might not exist
    }
  }

  async getLocalPath(url: string): Promise<string> {
    // Download from Cloudinary to temp file for OCR processing
    if (!this.isUrlFromStorage(url)) {
      throw new Error('URL is not from Cloudinary storage');
    }

    // Create temp file path
    const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const tempPath = path.join(this.tempDir, tempFilename);

    try {
      // Download from Cloudinary
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download from Cloudinary: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(tempPath, buffer);

      return tempPath;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  isUrlFromStorage(url: string): boolean {
    return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
  }

  /**
   * Clean up temporary files older than 1 hour
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith('temp_')) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > oneHour) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error);
    }
  }
}

