import { createWorker } from 'tesseract.js';
import { parseReceiptText } from './receipt-parser';

export interface OCRResult {
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

export class OCRProcessor {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    if (this.worker) return;

    this.worker = await createWorker('spa+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          // Log progress quietly to avoid spam
          // eslint-disable-next-line no-console
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Configure for receipts
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789.,€$£-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúñÁÉÍÓÚÑ ',
    });
  }

  async processImage(imagePath: string): Promise<OCRResult> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      const { data: { text, confidence } } = await this.worker!.recognize(imagePath);

      const extractedData = this.parseReceiptText(text);

      return {
        text,
        confidence,
        extractedData
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      // Return fallback result instead of throwing to avoid breaking the flow
      return {
        text: '',
        confidence: 0,
        extractedData: {}
      };
    }
  }

  private parseReceiptText(text: string): OCRResult['extractedData'] {
    return parseReceiptText(text);
  }

  // Method to use Google Vision API instead of Tesseract
  async processImageWithVision(imagePath: string): Promise<OCRResult> {
    try {
      const { VisionOCRClient } = await import('./vision/client');
      const visionClient = new VisionOCRClient();
      const visionResult = await visionClient.processImage(imagePath);

      return {
        text: visionResult.text,
        confidence: visionResult.confidence,
        extractedData: visionResult.extractedData
      };
    } catch (error) {
      console.error('Vision API failed, falling back to Tesseract:', error);
      // Fallback to Tesseract
      return this.processImage(imagePath);
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance for reuse
let ocrProcessor: OCRProcessor | null = null;

export async function getOCRProcessor(): Promise<OCRProcessor> {
  if (!ocrProcessor) {
    ocrProcessor = new OCRProcessor();
    await ocrProcessor.initialize();
  }
  return ocrProcessor;
}



export async function processReceiptOCR(imagePath: string, useVision: boolean = false): Promise<OCRResult> {
  const processor = await getOCRProcessor();

  if (useVision) {
    return await processor.processImageWithVision(imagePath);
  } else {
    return await processor.processImage(imagePath);
  }
}