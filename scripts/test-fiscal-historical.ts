/**
 * Script to test fiscal projections with historical data
 * Compares projections against actual fiscal data to validate accuracy
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import FiscalProjection from '../src/lib/models/FiscalProjection';
import Invoice from '../src/lib/models/Invoice';
import { generateIVAProjections, generateIRPFProjection } from '../src/lib/fiscal/forecasting';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface TestResult {
  year: number;
  type: 'iva' | 'irpf';
  quarter?: number;
  projected: number;
  actual: number;
  difference: number;
  accuracy: number; // Percentage
  passed: boolean; // >85% accuracy
}

async function testFiscalProjections(userId: string, testYears: number[] = [2023, 2024]) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoicing-app');
    console.log('✅ Connected to MongoDB');

    const results: TestResult[] = [];

    for (const year of testYears) {
      console.log(`\n📊 Testing year ${year}...`);

      // Generate projections for this year
      console.log('  Generating IVA projections...');
      const ivaProjections = await generateIVAProjections(userId, year);
      
      console.log('  Generating IRPF projection...');
      const irpfProjection = await generateIRPFProjection(userId, year);

      // Get actual data from invoices for this year
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);

      const invoices = await Invoice.find({
        userId,
        createdAt: { $gte: yearStart, $lte: yearEnd },
        status: { $in: ['sent', 'paid', 'overdue'] },
      });

      // Calculate actual IVA by quarter
      const actualIVA: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      invoices.forEach(invoice => {
        const invoiceDate = invoice.createdAt || invoice.issuedDate || invoice.date;
        if (!invoiceDate) return;
        
        const invoiceMonth = new Date(invoiceDate).getMonth();
        const quarter = Math.floor(invoiceMonth / 3) + 1;
        
        const invoiceIVA = invoice.items?.reduce((sum: number, item: any) => {
          const itemTotal = (item.price || 0) * (item.quantity || 0);
          const taxRate = item.taxRate || 0;
          return sum + (itemTotal * taxRate / 100);
        }, 0) || 0;
        
        if (quarter >= 1 && quarter <= 4) {
          actualIVA[quarter] += invoiceIVA;
        }
      });

      // Test IVA projections
      for (const projection of ivaProjections) {
        if (!projection.quarter) continue;
        
        const actual = actualIVA[projection.quarter] || 0;
        const projected = projection.projectedAmount || 0;
        const difference = Math.abs(projected - actual);
        const accuracy = actual > 0 
          ? Math.max(0, 100 - (difference / actual) * 100)
          : projected === 0 ? 100 : 0;
        const passed = accuracy >= 85;

        results.push({
          year,
          type: 'iva',
          quarter: projection.quarter,
          projected,
          actual,
          difference,
          accuracy,
          passed,
        });

        console.log(`  Q${projection.quarter} IVA: ${accuracy.toFixed(1)}% accuracy ${passed ? '✅' : '❌'}`);
        console.log(`    Projected: €${projected.toFixed(2)}, Actual: €${actual.toFixed(2)}, Difference: €${difference.toFixed(2)}`);
      }

      // Test IRPF projection
      const actualIRPF = invoices.reduce((sum, inv) => {
        // Simplified: assume 20% of revenue is IRPF
        return sum + (inv.total * 0.20);
      }, 0);

      const projectedIRPF = irpfProjection.projectedAmount || 0;
      const irpfDifference = Math.abs(projectedIRPF - actualIRPF);
      const irpfAccuracy = actualIRPF > 0
        ? Math.max(0, 100 - (irpfDifference / actualIRPF) * 100)
        : projectedIRPF === 0 ? 100 : 0;
      const irpfPassed = irpfAccuracy >= 85;

      results.push({
        year,
        type: 'irpf',
        projected: projectedIRPF,
        actual: actualIRPF,
        difference: irpfDifference,
        accuracy: irpfAccuracy,
        passed: irpfPassed,
      });

      console.log(`  IRPF: ${irpfAccuracy.toFixed(1)}% accuracy ${irpfPassed ? '✅' : '❌'}`);
      console.log(`    Projected: €${projectedIRPF.toFixed(2)}, Actual: €${actualIRPF.toFixed(2)}, Difference: €${irpfDifference.toFixed(2)}`);
    }

    // Summary
    console.log('\n📈 Test Summary:');
    console.log('='.repeat(60));
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed (>85% accuracy): ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Average Accuracy: ${averageAccuracy.toFixed(1)}%`);
    
    const ivaResults = results.filter(r => r.type === 'iva');
    const irpfResults = results.filter(r => r.type === 'irpf');
    
    if (ivaResults.length > 0) {
      const ivaAvg = ivaResults.reduce((sum, r) => sum + r.accuracy, 0) / ivaResults.length;
      console.log(`IVA Average Accuracy: ${ivaAvg.toFixed(1)}%`);
    }
    
    if (irpfResults.length > 0) {
      const irpfAvg = irpfResults.reduce((sum, r) => sum + r.accuracy, 0) / irpfResults.length;
      console.log(`IRPF Average Accuracy: ${irpfAvg.toFixed(1)}%`);
    }

    console.log('\n' + '='.repeat(60));
    
    if (averageAccuracy >= 85) {
      console.log('✅ Overall accuracy meets threshold (>85%)');
      process.exit(0);
    } else {
      console.log('❌ Overall accuracy below threshold (<85%)');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error testing fiscal projections:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Get userId from command line or use first user
const userId = process.argv[2];
const testYears = process.argv.slice(3).map(y => parseInt(y)) || [2023, 2024];

if (!userId) {
  console.error('Usage: tsx scripts/test-fiscal-historical.ts <userId> [year1] [year2] ...');
  console.error('Example: tsx scripts/test-fiscal-historical.ts 507f1f77bcf86cd799439011 2023 2024');
  process.exit(1);
}

testFiscalProjections(userId, testYears);

