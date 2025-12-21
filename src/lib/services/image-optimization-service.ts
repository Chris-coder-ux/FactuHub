/**
 * Image Optimization Service
 * Compresses and optimizes images before storage
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'avif';
  compress?: boolean;
}

export class ImageOptimizationService {
  /**
   * Optimize image buffer
   */
  static async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 85,
        format = 'jpeg',
        compress = true,
      } = options;

      let image = sharp(buffer);

      // Get image metadata
      const metadata = await image.metadata();
      const originalSize = buffer.length;

      // Resize if needed
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          image = image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Convert and optimize based on format
      let optimizedBuffer: Buffer;
      if (format === 'webp') {
        optimizedBuffer = await image
          .webp({ quality, effort: 6 })
          .toBuffer();
      } else if (format === 'avif') {
        optimizedBuffer = await image
          .avif({ quality, effort: 4 })
          .toBuffer();
      } else {
        // JPEG
        optimizedBuffer = await image
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }

      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      logger.info('Image optimized', {
        originalSize,
        optimizedSize,
        compressionRatio: `${compressionRatio.toFixed(1)}%`,
        format,
      });

      return optimizedBuffer;
    } catch (error) {
      logger.error('Image optimization error', error);
      // Return original buffer if optimization fails
      return buffer;
    }
  }

  /**
   * Optimize image for receipts (smaller size, good quality for OCR)
   */
  static async optimizeReceiptImage(buffer: Buffer): Promise<Buffer> {
    return this.optimizeImage(buffer, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 90, // Higher quality for OCR accuracy
      format: 'jpeg', // JPEG is better for OCR
      compress: true,
    });
  }

  /**
   * Optimize image for thumbnails (very small, fast loading)
   */
  static async optimizeThumbnail(buffer: Buffer): Promise<Buffer> {
    return this.optimizeImage(buffer, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 75,
      format: 'webp', // WebP for smaller thumbnails
      compress: true,
    });
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(buffer: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Error getting image metadata', error);
      return {
        size: buffer.length,
      };
    }
  }
}

