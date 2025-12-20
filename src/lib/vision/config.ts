// src/lib/vision/config.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';

let visionClient: ImageAnnotatorClient | null = null;

export function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    // Google Cloud Vision will automatically use credentials from:
    // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account key)
    // 2. Application Default Credentials (ADC) if running on GCP
    // 3. gcloud auth application-default login if local development
    visionClient = new ImageAnnotatorClient();
  }
  return visionClient;
}

export const VISION_CONFIG = {
  // Language hints for better OCR accuracy on Spanish receipts
  languageHints: ['es', 'en'],
  // Feature type for OCR
  feature: {
    type: 'TEXT_DETECTION' as const,
  },
};