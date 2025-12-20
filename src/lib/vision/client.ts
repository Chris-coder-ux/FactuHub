// src/lib/vision/client.ts
import { getVisionClient, VISION_CONFIG } from './config';
import path from 'path';
import fs from 'fs';

export interface VisionOCRResult {
  text: string;
  confidence: number;
  extractedData: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    items?: Array<{
      description: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  };
}

export class VisionOCRClient {
  async processImage(imagePath: string): Promise<VisionOCRResult> {
    try {
      const client = getVisionClient();

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      const image = {
        content: imageBuffer.toString('base64'),
      };

      const request = {
        image,
        features: [VISION_CONFIG.feature],
        imageContext: {
          languageHints: VISION_CONFIG.languageHints,
        },
      };

      const [result] = await client.annotateImage(request);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        throw new Error('No text detected in image');
      }

      // Full text from the first annotation (contains all text)
      const fullText = detections[0].description || '';
      const confidence = detections[0].boundingPoly ? 0.95 : 0.8; // Vision API doesn't provide confidence, estimate based on detection

      const extractedData = this.parseReceiptText(fullText);

      return {
        text: fullText,
        confidence,
        extractedData,
      };
    } catch (error) {
      console.error('Vision API error:', error);
      // Return fallback result instead of throwing
      return {
        text: '',
        confidence: 0,
        extractedData: {},
      };
    }
  }

  private parseReceiptText(text: string): VisionOCRResult['extractedData'] {
    // Reuse the existing parsing logic from ocr-processor.ts
    return parseReceiptText(text);
  }
}

// Import the parseReceiptText function from receipt-parser.ts
import { parseReceiptText } from '../receipt-parser';

export async function processReceiptWithVision(imagePath: string): Promise<VisionOCRResult> {
  const client = new VisionOCRClient();
  return await client.processImage(imagePath);
}