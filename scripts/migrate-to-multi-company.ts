/**
 * Migration script to add companyId to existing data
 * 
 * This script:
 * 1. Creates a default company for each user without one
 * 2. Assigns companyId to all existing records
 * 3. Updates user's default companyId
 * 
 * Usage: npx ts-node scripts/migrate-to-multi-company.ts
 */

import mongoose from 'mongoose';
import connectDB from '../src/lib/mongodb';
import Company from '../src/lib/models/Company';
import User from '../src/lib/models/User';
import Invoice from '../src/lib/models/Invoice';
import Client from '../src/lib/models/Client';
import Product from '../src/lib/models/Product';
import Receipt from '../src/lib/models/Receipt';
import BankAccount from '../src/lib/models/BankAccount';
import FiscalProjection from '../src/lib/models/FiscalProjection';

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

      // Migrate invoices
      const invoiceResult = await Invoice.updateMany(
        { companyId: null },
        { $set: { companyId: company._id } }
      );
      if (invoiceResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${invoiceResult.modifiedCount} invoices`);
      }

      // Migrate clients
      const clientResult = await Client.updateMany(
        { companyId: null },
        { $set: { companyId: company._id } }
      );
      if (clientResult.modifiedCount > 0) {
        console.log(`  ✅ Migrated ${clientResult.modifiedCount} clients`);
      }

      // Migrate products
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

