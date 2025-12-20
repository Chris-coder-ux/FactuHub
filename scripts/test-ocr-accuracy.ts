/**
 * Script para testing de precisión OCR con dataset real de recibos españoles
 * 
 * Uso:
 *   npm run test:ocr-accuracy
 * 
 * Requisitos:
 *   - Dataset de recibos en tests/fixtures/receipts/
 *   - Archivo de ground truth en tests/fixtures/receipts/ground-truth.json
 */

import fs from 'fs';
import path from 'path';
import { processReceiptOCR } from '../src/lib/ocr-processor';
import { getReceiptImagePath } from '../src/lib/file-upload';

interface GroundTruth {
  filename: string;
  expected: {
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
    confidence?: number; // Expected minimum confidence
  };
}

interface TestResult {
  filename: string;
  passed: boolean;
  metrics: {
    merchantAccuracy: number; // 0-1
    dateAccuracy: number;
    totalAccuracy: number;
    taxAccuracy: number;
    itemsAccuracy: number;
    overallAccuracy: number;
    confidenceScore: number;
  };
  errors: string[];
  extracted: any;
  expected: any;
}

/**
 * Calculate accuracy for a field (fuzzy matching for strings, percentage for numbers)
 */
function calculateFieldAccuracy(extracted: any, expected: any, field: string): number {
  if (expected === undefined || expected === null) {
    return extracted === undefined || extracted === null ? 1 : 0;
  }

  if (extracted === undefined || extracted === null) {
    return 0;
  }

  // String fields: fuzzy matching
  if (typeof expected === 'string') {
    const extractedStr = String(extracted).toLowerCase().trim();
    const expectedStr = expected.toLowerCase().trim();
    
    // Exact match
    if (extractedStr === expectedStr) return 1;
    
    // Contains match (partial credit)
    if (extractedStr.includes(expectedStr) || expectedStr.includes(extractedStr)) {
      return 0.7;
    }
    
    // Levenshtein distance for similarity
    const similarity = levenshteinSimilarity(extractedStr, expectedStr);
    return similarity > 0.8 ? similarity : 0;
  }

  // Number fields: percentage accuracy
  if (typeof expected === 'number') {
    const extractedNum = Number(extracted);
    if (isNaN(extractedNum)) return 0;
    
    const diff = Math.abs(extractedNum - expected);
    const maxValue = Math.max(Math.abs(expected), Math.abs(extractedNum), 1);
    const accuracy = 1 - (diff / maxValue);
    return Math.max(0, Math.min(1, accuracy));
  }

  return 0;
}

/**
 * Calculate Levenshtein similarity (0-1)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate items accuracy (matching items by description)
 */
function calculateItemsAccuracy(extracted: any[], expected: any[]): number {
  if (!expected || expected.length === 0) {
    return (!extracted || extracted.length === 0) ? 1 : 0;
  }
  
  if (!extracted || extracted.length === 0) {
    return 0;
  }

  let totalAccuracy = 0;
  const matched = new Set<number>();
  
  for (const expectedItem of expected) {
    let bestMatch = -1;
    let bestAccuracy = 0;
    
    for (let i = 0; i < extracted.length; i++) {
      if (matched.has(i)) continue;
      
      const descAccuracy = calculateFieldAccuracy(
        extracted[i].description,
        expectedItem.description,
        'description'
      );
      
      if (descAccuracy > bestAccuracy) {
        bestAccuracy = descAccuracy;
        bestMatch = i;
      }
    }
    
    if (bestMatch >= 0 && bestAccuracy > 0.5) {
      matched.add(bestMatch);
      const itemAccuracy = (
        bestAccuracy * 0.5 + // Description weight
        calculateFieldAccuracy(extracted[bestMatch].total, expectedItem.total, 'total') * 0.3 +
        calculateFieldAccuracy(extracted[bestMatch].price, expectedItem.price, 'price') * 0.2
      );
      totalAccuracy += itemAccuracy;
    }
  }
  
  return totalAccuracy / expected.length;
}

/**
 * Test a single receipt against ground truth
 */
async function testReceipt(
  imagePath: string,
  groundTruth: GroundTruth,
  useVision: boolean = false
): Promise<TestResult> {
  const errors: string[] = [];
  
  try {
    // Process OCR
    const ocrResult = await processReceiptOCR(imagePath, useVision);
    const extracted = ocrResult.extractedData;
    const expected = groundTruth.expected;
    
    // Calculate metrics
    const merchantAccuracy = calculateFieldAccuracy(extracted.merchant, expected.merchant, 'merchant');
    const dateAccuracy = calculateFieldAccuracy(extracted.date, expected.date, 'date');
    const totalAccuracy = calculateFieldAccuracy(extracted.total, expected.total, 'total');
    const taxAccuracy = calculateFieldAccuracy(extracted.tax, expected.tax, 'tax');
    const itemsAccuracy = calculateItemsAccuracy(extracted.items || [], expected.items || []);
    
    // Overall accuracy (weighted average)
    const overallAccuracy = (
      merchantAccuracy * 0.15 +
      dateAccuracy * 0.15 +
      totalAccuracy * 0.35 +
      taxAccuracy * 0.20 +
      itemsAccuracy * 0.15
    );
    
    // Check confidence threshold
    if (expected.confidence && ocrResult.confidence < expected.confidence) {
      errors.push(`Confidence ${ocrResult.confidence} below expected ${expected.confidence}`);
    }
    
    // Check if overall accuracy meets threshold
    const passed = overallAccuracy >= 0.9 && ocrResult.confidence >= 80;
    
    if (!passed) {
      if (overallAccuracy < 0.9) {
        errors.push(`Overall accuracy ${(overallAccuracy * 100).toFixed(1)}% below 90% threshold`);
      }
      if (ocrResult.confidence < 80) {
        errors.push(`Confidence ${ocrResult.confidence} below 80% threshold`);
      }
    }
    
    return {
      filename: groundTruth.filename,
      passed,
      metrics: {
        merchantAccuracy,
        dateAccuracy,
        totalAccuracy,
        taxAccuracy,
        itemsAccuracy,
        overallAccuracy,
        confidenceScore: ocrResult.confidence,
      },
      errors,
      extracted,
      expected,
    };
  } catch (error: any) {
    return {
      filename: groundTruth.filename,
      passed: false,
      metrics: {
        merchantAccuracy: 0,
        dateAccuracy: 0,
        totalAccuracy: 0,
        taxAccuracy: 0,
        itemsAccuracy: 0,
        overallAccuracy: 0,
        confidenceScore: 0,
      },
      errors: [`OCR processing failed: ${error.message}`],
      extracted: {},
      expected: groundTruth.expected,
    };
  }
}

/**
 * Main test function
 */
export async function runOCRAccuracyTests(
  datasetPath: string = 'tests/fixtures/receipts',
  useVision: boolean = false
): Promise<{
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageAccuracy: number;
    averageConfidence: number;
    passedRate: number;
  };
}> {
  const groundTruthPath = path.join(datasetPath, 'ground-truth.json');
  
  if (!fs.existsSync(groundTruthPath)) {
    throw new Error(`Ground truth file not found: ${groundTruthPath}`);
  }
  
  const groundTruthData = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));
  const groundTruths: GroundTruth[] = Array.isArray(groundTruthData) 
    ? groundTruthData 
    : groundTruthData.receipts || [];
  
  if (groundTruths.length === 0) {
    throw new Error('No ground truth data found');
  }
  
  console.log(`\n🧪 Testing OCR accuracy with ${groundTruths.length} receipts...\n`);
  console.log(`Using ${useVision ? 'Google Vision API' : 'Tesseract.js'}\n`);
  
  const results: TestResult[] = [];
  
  for (const groundTruth of groundTruths) {
    const imagePath = path.join(datasetPath, groundTruth.filename);
    
    if (!fs.existsSync(imagePath)) {
      console.warn(`⚠️  Image not found: ${groundTruth.filename}, skipping...`);
      continue;
    }
    
    console.log(`Processing: ${groundTruth.filename}...`);
    const result = await testReceipt(imagePath, groundTruth, useVision);
    results.push(result);
    
    const status = result.passed ? '✅' : '❌';
    console.log(
      `  ${status} Accuracy: ${(result.metrics.overallAccuracy * 100).toFixed(1)}% | ` +
      `Confidence: ${result.metrics.confidenceScore.toFixed(1)}%`
    );
    
    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(`    ⚠️  ${err}`));
    }
  }
  
  // Calculate summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const averageAccuracy = results.reduce((sum, r) => sum + r.metrics.overallAccuracy, 0) / total;
  const averageConfidence = results.reduce((sum, r) => sum + r.metrics.confidenceScore, 0) / total;
  const passedRate = passed / total;
  
  const summary = {
    total,
    passed,
    failed,
    averageAccuracy,
    averageConfidence,
    passedRate,
  };
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Receipts: ${total}`);
  console.log(`✅ Passed: ${passed} (${(passedRate * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Average Accuracy: ${(averageAccuracy * 100).toFixed(1)}%`);
  console.log(`🎯 Average Confidence: ${averageConfidence.toFixed(1)}%`);
  console.log(`\n${passedRate >= 0.9 ? '✅' : '❌'} Overall: ${passedRate >= 0.9 ? 'PASSED' : 'FAILED'} (>90% accuracy required)`);
  console.log('='.repeat(60) + '\n');
  
  return { results, summary };
}

// CLI execution
if (require.main === module) {
  const useVision = process.argv.includes('--vision') || process.env.USE_VISION_OCR === 'true';
  const datasetPath = process.argv.find(arg => arg.startsWith('--dataset='))?.split('=')[1] || 'tests/fixtures/receipts';
  
  runOCRAccuracyTests(datasetPath, useVision)
    .then(({ summary }) => {
      process.exit(summary.passedRate >= 0.9 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

