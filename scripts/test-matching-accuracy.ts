/**
 * Script para validar la precisión del algoritmo de matching
 * 
 * Este script:
 * - Genera casos de prueba con datos conocidos
 * - Ejecuta el algoritmo de matching
 * - Calcula métricas de precisión (precision, recall, F1-score)
 * - Genera reporte de resultados
 * 
 * Uso: tsx scripts/test-matching-accuracy.ts
 */

import connectDB from '../src/lib/mongodb';
import { findMatches } from '../src/lib/banking/matching';
import BankTransaction from '../src/lib/models/BankTransaction';
import Invoice from '../src/lib/models/Invoice';

interface TestCase {
  id: string;
  transaction: {
    amount: number;
    date: Date;
    description: string;
  };
  expectedInvoice: {
    invoiceNumber: number;
    total: number;
    createdAt: Date;
  };
  shouldMatch: boolean;
  minScore?: number;
}

interface AccuracyMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

// Test cases with known expected outcomes
const testCases: TestCase[] = [
  // Perfect matches (should match)
  {
    id: 'perfect-match-1',
    transaction: {
      amount: 1000.00,
      date: new Date('2024-01-15'),
      description: 'Payment for Invoice #12345',
    },
    expectedInvoice: {
      invoiceNumber: 12345,
      total: 1000.00,
      createdAt: new Date('2024-01-10'),
    },
    shouldMatch: true,
    minScore: 0.8,
  },
  {
    id: 'perfect-match-2',
    transaction: {
      amount: 500.50,
      date: new Date('2024-02-01'),
      description: 'Invoice #67890 payment',
    },
    expectedInvoice: {
      invoiceNumber: 67890,
      total: 500.50,
      createdAt: new Date('2024-01-28'),
    },
    shouldMatch: true,
    minScore: 0.8,
  },
  // Amount match but different invoice (should not match)
  {
    id: 'amount-only-match',
    transaction: {
      amount: 1000.00,
      date: new Date('2024-01-15'),
      description: 'Random payment',
    },
    expectedInvoice: {
      invoiceNumber: 99999,
      total: 1000.00,
      createdAt: new Date('2024-01-01'),
    },
    shouldMatch: false, // Amount matches but no other indicators
  },
  // Date match but wrong amount (should not match)
  {
    id: 'date-only-match',
    transaction: {
      amount: 1000.00,
      date: new Date('2024-01-15'),
      description: 'Payment',
    },
    expectedInvoice: {
      invoiceNumber: 12345,
      total: 2000.00,
      createdAt: new Date('2024-01-12'),
    },
    shouldMatch: false,
  },
  // No match (should not match)
  {
    id: 'no-match',
    transaction: {
      amount: 100.00,
      date: new Date('2024-03-01'),
      description: 'Unrelated payment',
    },
    expectedInvoice: {
      invoiceNumber: 12345,
      total: 1000.00,
      createdAt: new Date('2024-01-10'),
    },
    shouldMatch: false,
  },
];

function createMockTransaction(testCase: TestCase): any {
  return {
    _id: `tx-${testCase.id}`,
    amount: testCase.transaction.amount,
    date: testCase.transaction.date,
    description: testCase.transaction.description,
    reconciled: false,
  };
}

function createMockInvoice(testCase: TestCase): any {
  return {
    _id: `inv-${testCase.id}`,
    invoiceNumber: testCase.expectedInvoice.invoiceNumber,
    total: testCase.expectedInvoice.total,
    createdAt: testCase.expectedInvoice.createdAt,
    dueDate: new Date(testCase.expectedInvoice.createdAt.getTime() + 10 * 24 * 60 * 60 * 1000),
    status: 'sent',
    client: { name: 'Test Client' },
  };
}

function calculateMetrics(results: Array<{ testCase: TestCase; matched: boolean; score: number }>): AccuracyMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  for (const result of results) {
    const { testCase, matched } = result;
    
    if (testCase.shouldMatch && matched) {
      truePositives++;
    } else if (!testCase.shouldMatch && matched) {
      falsePositives++;
    } else if (testCase.shouldMatch && !matched) {
      falseNegatives++;
    } else {
      trueNegatives++;
    }
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  
  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;
  
  const f1Score = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;
  
  const accuracy = results.length > 0
    ? (truePositives + trueNegatives) / results.length
    : 0;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision,
    recall,
    f1Score,
    accuracy,
  };
}

async function main() {
  console.log('🎯 Testing Matching Algorithm Accuracy\n');
  
  await connectDB();
  
  const results: Array<{ testCase: TestCase; matched: boolean; score: number; topMatch?: any }> = [];
  
  for (const testCase of testCases) {
    const transaction = createMockTransaction(testCase);
    const invoice = createMockInvoice(testCase);
    
    // Create additional invoices to test ranking
    const otherInvoices = testCases
      .filter(tc => tc.id !== testCase.id)
      .map(tc => createMockInvoice(tc));
    
    const allInvoices = [invoice, ...otherInvoices];
    const matches = findMatches(transaction, allInvoices);
    
    const matched = matches.length > 0 && matches[0].invoice._id === invoice._id;
    const score = matches.length > 0 ? matches[0].score : 0;
    
    // Check if score meets minimum threshold
    const meetsThreshold = testCase.minScore ? score >= testCase.minScore : true;
    const correctMatch = matched && meetsThreshold;
    
    results.push({
      testCase,
      matched: correctMatch,
      score,
      topMatch: matches.length > 0 ? matches[0] : undefined,
    });
    
    const status = correctMatch === testCase.shouldMatch ? '✓' : '✗';
    console.log(`${status} ${testCase.id}: ${matched ? 'Matched' : 'Not matched'} (score: ${score.toFixed(2)})`);
    
    if (!correctMatch && testCase.shouldMatch) {
      console.log(`  ⚠ Expected match but got score ${score.toFixed(2)} (min: ${testCase.minScore})`);
    }
  }
  
  // Calculate metrics
  const metrics = calculateMetrics(results);
  
  console.log('\n📊 Accuracy Metrics:');
  console.log('─'.repeat(60));
  console.log(`True Positives:  ${metrics.truePositives}`);
  console.log(`False Positives: ${metrics.falsePositives}`);
  console.log(`False Negatives: ${metrics.falseNegatives}`);
  console.log(`True Negatives: ${metrics.trueNegatives}`);
  console.log('─'.repeat(60));
  console.log(`Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`Recall:    ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`F1-Score:  ${(metrics.f1Score * 100).toFixed(2)}%`);
  console.log(`Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log('─'.repeat(60));
  
  // Threshold check
  const targetAccuracy = 0.80; // 80%
  if (metrics.accuracy >= targetAccuracy) {
    console.log(`✅ Accuracy meets target (≥${targetAccuracy * 100}%)`);
  } else {
    console.log(`⚠️  Accuracy below target (${targetAccuracy * 100}%)`);
    process.exit(1);
  }
  
  if (metrics.precision >= 0.75 && metrics.recall >= 0.75) {
    console.log('✅ Precision and Recall meet targets (≥75%)');
  } else {
    console.log('⚠️  Precision or Recall below targets (75%)');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as testMatchingAccuracy };

