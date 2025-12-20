/**
 * File Upload Utilities
 * Wrapper around StorageService for backward compatibility
 * Supports both local and cloud storage (Cloudinary)
 */

import { getStorageService } from './storage';

/**
 * Save a receipt image using the configured storage service
 * @param file - File to upload
 * @param userId - User ID for metadata
 * @returns Public URL of the uploaded image
 */
export async function saveReceiptImage(file: File, userId: string): Promise<string> {
  const storage = getStorageService();
  
  // Upload with metadata
  return await storage.upload(file, 'receipts', {
    userId,
    uploadedAt: new Date().toISOString(),
  });
}

/**
 * Delete a receipt image using the configured storage service
 * @param imageUrl - Public URL of the image to delete
 */
export async function deleteReceiptImage(imageUrl: string): Promise<void> {
  const storage = getStorageService();
  await storage.delete(imageUrl);
}

/**
 * Get local file path for an image (for OCR processing)
 * Downloads from cloud storage if necessary
 * @param imageUrl - Public URL of the image
 * @returns Local file path
 */
export async function getReceiptImagePath(imageUrl: string): Promise<string> {
  const storage = getStorageService();
  return await storage.getLocalPath(imageUrl);
}

/**
 * Check if an image URL is from local storage
 * @param imageUrl - URL to check
 */
export function isLocalImageUrl(imageUrl: string): boolean {
  return imageUrl.startsWith('/uploads/');
}

/**
 * Check if an image URL is from cloud storage (Cloudinary)
 * @param imageUrl - URL to check
 */
export function isCloudImageUrl(imageUrl: string): boolean {
  // Cloudinary URLs are full HTTPS URLs, not relative paths
  return imageUrl.startsWith('https://') && imageUrl.includes('cloudinary.com');
}