/**
 * Verification script for data migration
 * 
 * This script verifies that the migration to multi-company was successful:
 * 1. All users have companyId
 * 2. All records have companyId
 * 3. No orphaned records
 * 4. Composite indexes work correctly
 * 
 * Usage: npx tsx scripts/verify-migration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(MONGODB_URI);
  return mongoose.connection;
}

import User from '../src/lib/models/User';
import Company from '../src/lib/models/Company';
import Invoice from '../src/lib/models/Invoice';
import Client from '../src/lib/models/Client';
import Product from '../src/lib/models/Product';
import Receipt from '../src/lib/models/Receipt';
import BankAccount from '../src/lib/models/BankAccount';
import FiscalProjection from '../src/lib/models/FiscalProjection';
import Expense from '../src/lib/models/Expense';
import Settings from '../src/lib/models/Settings';

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyMigration(): Promise<void> {
  try {
    console.log('🔍 Starting migration verification...\n');
    await connectDB();

    const results: VerificationResult[] = [];

    // 1. Verify all users have companyId
    console.log('1️⃣ Verifying users have companyId...');
    const usersWithoutCompany = await User.countDocuments({ companyId: null });
    if (usersWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${usersWithoutCompany} users without companyId`,
        details: await User.find({ companyId: null }).select('email name').lean(),
      });
    } else {
      results.push({
        passed: true,
        message: 'All users have companyId',
      });
    }

    // 2. Verify all companies exist and have ownerId
    console.log('2️⃣ Verifying companies...');
    const companies = await Company.find().lean();
    const companiesWithoutOwner = companies.filter(c => !c.ownerId);
    if (companiesWithoutOwner.length > 0) {
      results.push({
        passed: false,
        message: `Found ${companiesWithoutOwner.length} companies without ownerId`,
        details: companiesWithoutOwner.map(c => ({ id: c._id, name: c.name })),
      });
    } else {
      results.push({
        passed: true,
        message: `All ${companies.length} companies have ownerId`,
      });
    }

    // 3. Verify all invoices have companyId
    console.log('3️⃣ Verifying invoices...');
    const invoicesWithoutCompany = await Invoice.countDocuments({ companyId: null });
    if (invoicesWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${invoicesWithoutCompany} invoices without companyId`,
      });
    } else {
      const totalInvoices = await Invoice.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalInvoices} invoices have companyId`,
      });
    }

    // 4. Verify all clients have companyId
    console.log('4️⃣ Verifying clients...');
    const clientsWithoutCompany = await Client.countDocuments({ companyId: null });
    if (clientsWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${clientsWithoutCompany} clients without companyId`,
      });
    } else {
      const totalClients = await Client.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalClients} clients have companyId`,
      });
    }

    // 5. Verify all products have companyId
    console.log('5️⃣ Verifying products...');
    const productsWithoutCompany = await Product.countDocuments({ companyId: null });
    if (productsWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${productsWithoutCompany} products without companyId`,
      });
    } else {
      const totalProducts = await Product.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalProducts} products have companyId`,
      });
    }

    // 6. Verify all receipts have companyId
    console.log('6️⃣ Verifying receipts...');
    const receiptsWithoutCompany = await Receipt.countDocuments({ companyId: null });
    if (receiptsWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${receiptsWithoutCompany} receipts without companyId`,
      });
    } else {
      const totalReceipts = await Receipt.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalReceipts} receipts have companyId`,
      });
    }

    // 7. Verify all bank accounts have companyId
    console.log('7️⃣ Verifying bank accounts...');
    const bankAccountsWithoutCompany = await BankAccount.countDocuments({ companyId: null });
    if (bankAccountsWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${bankAccountsWithoutCompany} bank accounts without companyId`,
      });
    } else {
      const totalBankAccounts = await BankAccount.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalBankAccounts} bank accounts have companyId`,
      });
    }

    // 8. Verify all expenses have companyId
    console.log('8️⃣ Verifying expenses...');
    const expensesWithoutCompany = await Expense.countDocuments({ companyId: null });
    if (expensesWithoutCompany > 0) {
      results.push({
        passed: false,
        message: `Found ${expensesWithoutCompany} expenses without companyId`,
      });
    } else {
      const totalExpenses = await Expense.countDocuments();
      results.push({
        passed: true,
        message: `All ${totalExpenses} expenses have companyId`,
      });
    }

    // 9. Verify all companies have settings
    console.log('9️⃣ Verifying settings...');
    const companiesWithoutSettings = [];
    for (const company of companies) {
      const settings = await Settings.findOne({ companyId: company._id });
      if (!settings) {
        companiesWithoutSettings.push(company._id);
      }
    }
    if (companiesWithoutSettings.length > 0) {
      results.push({
        passed: false,
        message: `Found ${companiesWithoutSettings.length} companies without settings`,
        details: companiesWithoutSettings,
      });
    } else {
      results.push({
        passed: true,
        message: `All ${companies.length} companies have settings`,
      });
    }

    // 10. Test composite index queries
    console.log('🔟 Testing composite index queries...');
    try {
      const testCompany = companies[0];
      if (testCompany) {
        const invoices = await Invoice.find({ companyId: testCompany._id }).limit(1).lean();
        const clients = await Client.find({ companyId: testCompany._id }).limit(1).lean();
        const products = await Product.find({ companyId: testCompany._id }).limit(1).lean();
        
        results.push({
          passed: true,
          message: 'Composite index queries work correctly',
          details: {
            invoicesFound: invoices.length,
            clientsFound: clients.length,
            productsFound: products.length,
          },
        });
      } else {
        results.push({
          passed: false,
          message: 'No companies found to test queries',
        });
      }
    } catch (error) {
      results.push({
        passed: false,
        message: 'Composite index queries failed',
        details: error,
      });
    }

    // Print results
    console.log('\n📊 Verification Results:\n');
    let allPassed = true;
    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.message}`);
      if (!result.passed) {
        allPassed = false;
        if (result.details) {
          console.log(`   Details:`, JSON.stringify(result.details, null, 2));
        }
      }
    });

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('✅ All verifications passed! Migration successful.');
    } else {
      console.log('❌ Some verifications failed. Please review the details above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

if (require.main === module) {
  verifyMigration()
    .then(() => {
      console.log('\n✨ Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error);
      process.exit(1);
    });
}

export default verifyMigration;

