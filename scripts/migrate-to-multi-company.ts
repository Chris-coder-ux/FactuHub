/**
 * Migration script to add companyId to existing data
 * 
 * This script:
 * 1. Creates a default company for each user without one
 * 2. Assigns companyId to all existing records
 * 3. Updates user's default companyId
 * 
 * Usage: npx tsx scripts/migrate-to-multi-company.ts
 * 
 * Note: Make sure .env.local exists with MONGODB_URI, NEXTAUTH_SECRET, and NEXTAUTH_URL
 */

// Load environment variables from .env.local BEFORE any other imports
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.warn('⚠️  .env.local not found. Make sure environment variables are set.');
}

// Connect directly to MongoDB without using env.ts validation
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required. Please set it in .env.local');
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(MONGODB_URI as string);
  return mongoose.connection;
}
import Company from '../src/lib/models/Company';
import User from '../src/lib/models/User';
import Invoice from '../src/lib/models/Invoice';
import Client from '../src/lib/models/Client';
import Product from '../src/lib/models/Product';
import Receipt from '../src/lib/models/Receipt';
import BankAccount from '../src/lib/models/BankAccount';
import FiscalProjection from '../src/lib/models/FiscalProjection';
import Expense from '../src/lib/models/Expense';
import Settings from '../src/lib/models/Settings';

async function migrateToMultiCompany() {
  try {
    console.log('🔄 Starting migration to multi-company...');
    await connectDB();

    // Get all users without companyId
    const users = await User.find({ companyId: null });
    console.log(`📊 Found ${users.length} users without company`);

    let migratedCount = 0;

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);

      // Create default company for user
      const company = new Company({
        name: `${user.name}'s Company`,
        taxId: `TEMP-${user._id.toString().slice(-8)}`, // Temporary tax ID
        ownerId: user._id,
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'España',
        },
        members: [{
          userId: user._id,
          role: 'owner',
        }],
        settings: {
          currency: 'EUR',
          defaultTaxRate: 21,
          verifactuEnabled: false,
          verifactuEnvironment: 'sandbox',
        },
      });

      await company.save();
      console.log(`  ✅ Created company: ${company.name} (${company._id})`);

      // Update user's companyId
      user.companyId = company._id;
      await user.save();
      console.log(`  ✅ Updated user companyId`);

      // Migrate invoices (only those without companyId - will be assigned to this user's company)
      // Note: Invoices don't have userId, so we migrate all invoices without companyId
      // This assumes invoices belong to the user creating them
      const invoiceResult = await Invoice.updateMany(
        { companyId: null },
        { $set: { companyId: company._id } }
      );
      if (invoiceResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${invoiceResult.modifiedCount} invoices`);
      }

      // Migrate clients (only those without companyId)
      const clientResult = await Client.updateMany(
        { companyId: null },
        { $set: { companyId: company._id } }
      );
      if (clientResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${clientResult.modifiedCount} clients`);
      }

      // Migrate products (only those without companyId)
      const productResult = await Product.updateMany(
        { companyId: null },
        { $set: { companyId: company._id } }
      );
      if (productResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${productResult.modifiedCount} products`);
      }

      // Migrate receipts
      const receiptResult = await Receipt.updateMany(
        { userId: user._id, companyId: null },
        { $set: { companyId: company._id } }
      );
      if (receiptResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${receiptResult.modifiedCount} receipts`);
      }

      // Migrate bank accounts
      const bankAccountResult = await BankAccount.updateMany(
        { userId: user._id, companyId: null },
        { $set: { companyId: company._id } }
      );
      if (bankAccountResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${bankAccountResult.modifiedCount} bank accounts`);
      }

      // Migrate fiscal projections
      const fiscalResult = await FiscalProjection.updateMany(
        { userId: user._id, companyId: null },
        { $set: { companyId: company._id } }
      );
      if (fiscalResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${fiscalResult.modifiedCount} fiscal projections`);
      }

      // Migrate expenses
      const expenseResult = await Expense.updateMany(
        { userId: user._id, companyId: null },
        { $set: { companyId: company._id } }
      );
      if (expenseResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${expenseResult.modifiedCount} expenses`);
      }

      // Migrate or create Settings for the company
      const existingSettings = await Settings.findOne({ companyId: company._id });
      if (!existingSettings) {
        // Create default settings for the company
        const settings = new Settings({
          companyId: company._id,
          companyName: company.name,
          taxId: company.taxId,
          email: user.email,
          address: company.address,
          currency: company.settings.currency,
          defaultTaxRate: company.settings.defaultTaxRate,
          verifactuEnabled: company.settings.verifactuEnabled,
          verifactuEnvironment: company.settings.verifactuEnvironment,
        });
        await settings.save();
        console.log(`  ✅ Created default settings for company`);
      } else {
        console.log(`  ℹ️  Settings already exist for company`);
      }

      migratedCount++;
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Users migrated: ${migratedCount}`);
    console.log(`   - Companies created: ${migratedCount}`);
    console.log(`\n⚠️  IMPORTANT: Review and update temporary tax IDs in companies!`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateToMultiCompany()
    .then(() => {
      console.log('\n✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateToMultiCompany;

