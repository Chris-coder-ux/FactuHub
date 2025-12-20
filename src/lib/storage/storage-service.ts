/**
 * Storage Service Interface
 * Abstract storage layer that supports both local filesystem and cloud storage (Cloudinary)
 * Allows easy migration and testing between storage backends
 */

export interface StorageService {
  /**
   * Upload a file and return its public URL
   * @param file - File to upload
   * @param folder - Folder/path where to store the file
   * @param metadata - Optional metadata (userId, companyId, etc.)
   * @returns Public URL of the uploaded file
   */
  upload(file: File | Buffer, folder: string, metadata?: Record<string, any>): Promise<string>;

  /**
   * Delete a file by its URL
   * @param url - Public URL of the file to delete
   */
  delete(url: string): Promise<void>;

  /**
   * Get a temporary local path for a file (for OCR processing)
   * Downloads from cloud if necessary, returns local path if already local
   * @param url - Public URL of the file
   * @returns Local file path
   */
  getLocalPath(url: string): Promise<string>;

  /**
   * Check if a URL is from this storage service
   * @param url - URL to check
   */
  isUrlFromStorage(url: string): boolean;
}

