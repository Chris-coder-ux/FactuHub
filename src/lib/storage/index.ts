/**
 * Storage Service Factory
 * Returns the appropriate storage service based on environment configuration
 */

import { StorageService } from './storage-service';
import { LocalStorage } from './local-storage';
import { CloudinaryStorage } from './cloudinary-storage';

let storageInstance: StorageService | null = null;

/**
 * Get the configured storage service instance
 * Uses Cloudinary if configured, otherwise falls back to local storage
 */
export function getStorageService(): StorageService {
  if (storageInstance) {
    return storageInstance;
  }

  // Use Cloudinary if configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    storageInstance = new CloudinaryStorage();
    console.log('✅ Using Cloudinary storage');
  } else {
    storageInstance = new LocalStorage();
    console.log('📁 Using local filesystem storage');
  }

  return storageInstance;
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorageInstance(): void {
  storageInstance = null;
}

// Export types and implementations
export type { StorageService } from './storage-service';
export { LocalStorage } from './local-storage';
export { CloudinaryStorage } from './cloudinary-storage';

