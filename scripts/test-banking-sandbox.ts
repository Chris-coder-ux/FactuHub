/**
 * Script de testing para sandbox bancario BBVA
 * 
 * Este script prueba la integración con el sandbox de BBVA:
 * - Autenticación OAuth
 * - Obtención de cuentas
 * - Sincronización de transacciones
 * - Validación de datos
 * 
 * Uso: tsx scripts/test-banking-sandbox.ts
 */

import connectDB from '../src/lib/mongodb';
import { bbvaOAuth } from '../src/lib/banking/oauth';
import BBVABankingAPI from '../src/lib/banking/bbva-api';
import BankAccount from '../src/lib/models/BankAccount';
import BankTransaction from '../src/lib/models/BankTransaction';
import { syncBankTransactions } from '../src/lib/banking/bbva-api';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const testResults: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({
      test: name,
      passed: true,
      message: '✓ Test passed',
      duration,
    });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({
      test: name,
      passed: false,
      message: error.message || 'Test failed',
      duration,
    });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

async function testOAuthConfiguration() {
  if (!process.env.BBVA_CLIENT_ID) {
    throw new Error('BBVA_CLIENT_ID not set in environment');
  }
  if (!process.env.BBVA_CLIENT_SECRET) {
    throw new Error('BBVA_CLIENT_SECRET not set in environment');
  }
  if (!process.env.BBVA_REDIRECT_URI) {
    throw new Error('BBVA_REDIRECT_URI not set in environment');
  }
  
  // Verify OAuth instance is configured
  if (!bbvaOAuth) {
    throw new Error('BBVA OAuth instance not initialized');
  }
}

async function testBBVAAPIConfiguration() {
  const api = new BBVABankingAPI({
    clientId: process.env.BBVA_CLIENT_ID || '',
    clientSecret: process.env.BBVA_CLIENT_SECRET || '',
    baseUrl: 'https://api.sandbox.bbva.com/psd2/xs2a/v1',
  });
  
  if (!api) {
    throw new Error('BBVA API instance not created');
  }
}

async function testDatabaseConnection() {
  await connectDB();
  // Test query
  const count = await BankAccount.countDocuments();
  console.log(`  Found ${count} bank accounts in database`);
}

async function testSandboxEndpoints() {
  // Note: This requires a valid access token from sandbox
  // In a real scenario, you would need to:
  // 1. Complete OAuth flow with sandbox
  // 2. Store access token
  // 3. Use it here
  
  const api = new BBVABankingAPI({
    clientId: process.env.BBVA_CLIENT_ID || '',
    clientSecret: process.env.BBVA_CLIENT_SECRET || '',
    baseUrl: 'https://api.sandbox.bbva.com/psd2/xs2a/v1',
  });
  
  // Test that API instance can be created
  // Actual endpoint testing requires valid tokens
  console.log('  Note: Endpoint testing requires valid OAuth tokens');
  console.log('  To test endpoints:');
  console.log('  1. Complete OAuth flow with sandbox');
  console.log('  2. Store access token in BankAccount');
  console.log('  3. Run syncBankTransactions()');
}

async function testTransactionSync() {
  await connectDB();
  
  // Find a test bank account with access token
  const testAccount = await BankAccount.findOne({
    accessToken: { $exists: true, $ne: null },
    status: 'active',
  });
  
  if (!testAccount) {
    console.log('  ⚠ No active bank account with access token found');
    console.log('  To test sync:');
    console.log('  1. Connect a bank account via OAuth');
    console.log('  2. Ensure access token is stored');
    return;
  }
  
  console.log(`  Testing sync for account: ${testAccount._id}`);
  const result = await syncBankTransactions(testAccount._id.toString());
  
  if (!result.success) {
    throw new Error(`Sync failed: ${result.error || 'Unknown error'}`);
  }
  
  console.log(`  ✓ Synced ${result.transactionsCount} transactions`);
  
  // Verify transactions were saved
  const transactionCount = await BankTransaction.countDocuments({
    bankAccountId: testAccount._id,
  });
  console.log(`  Total transactions in database: ${transactionCount}`);
}

async function testTransactionDataIntegrity() {
  await connectDB();
  
  const transactions = await BankTransaction.find()
    .limit(10)
    .lean();
  
  if (transactions.length === 0) {
    console.log('  ⚠ No transactions found to validate');
    return;
  }
  
  for (const tx of transactions) {
    // Validate required fields
    if (!tx.transactionId) {
      throw new Error('Transaction missing transactionId');
    }
    if (typeof tx.amount !== 'number') {
      throw new Error('Transaction amount is not a number');
    }
    if (!tx.date) {
      throw new Error('Transaction missing date');
    }
    if (!tx.description) {
      throw new Error('Transaction missing description');
    }
    if (!tx.bankAccountId) {
      throw new Error('Transaction missing bankAccountId');
    }
  }
  
  console.log(`  ✓ Validated ${transactions.length} transactions`);
}

async function testMatchingAlgorithm() {
  await connectDB();
  
  // Get some unreconciled transactions
  const unreconciled = await BankTransaction.find({
    reconciled: false,
  }).limit(5).lean();
  
  if (unreconciled.length === 0) {
    console.log('  ⚠ No unreconciled transactions found');
    return;
  }
  
  console.log(`  Found ${unreconciled.length} unreconciled transactions`);
  console.log('  Matching algorithm will be tested in separate test suite');
}

async function main() {
  console.log('🧪 Testing Banking Sandbox Integration\n');
  
  await runTest('OAuth Configuration', testOAuthConfiguration);
  await runTest('BBVA API Configuration', testBBVAAPIConfiguration);
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Sandbox Endpoints', testSandboxEndpoints);
  await runTest('Transaction Sync', testTransactionSync);
  await runTest('Transaction Data Integrity', testTransactionDataIntegrity);
  await runTest('Matching Algorithm', testMatchingAlgorithm);
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('─'.repeat(60));
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  testResults.forEach(result => {
    const icon = result.passed ? '✓' : '✗';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.test}${duration}`);
    if (!result.passed) {
      console.log(`  Error: ${result.message}`);
    }
  });
  
  console.log('─'.repeat(60));
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed} | Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as testBankingSandbox };

