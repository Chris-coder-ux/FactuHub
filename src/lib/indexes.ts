/**
 * MongoDB Indexes Configuration
 * 
 * This file defines all database indexes for optimal query performance.
 * Indexes should be created when the application starts or during deployment.
 */

import mongoose from 'mongoose';
import Client from './models/Client';
import Invoice from './models/Invoice';
import Product from './models/Product';
import Payment from './models/Payment';
import RecurringInvoice from './models/RecurringInvoice';
import User from './models/User';

/**
 * Create all necessary indexes for the application
 * This should be called once during application startup
 */
export async function createIndexes() {
  try {
    console.log('Creating database indexes...');

    // Client indexes
    await Client.collection.createIndex({ email: 1 }, { unique: true });
    await Client.collection.createIndex({ createdAt: -1 });
    await Client.collection.createIndex({ name: 1 });

    // Invoice indexes
    await Invoice.collection.createIndex({ invoiceNumber: 1 }, { unique: true });
    await Invoice.collection.createIndex({ client: 1, createdAt: -1 });
    await Invoice.collection.createIndex({ status: 1 });
    await Invoice.collection.createIndex({ dueDate: 1 });
    await Invoice.collection.createIndex({ createdAt: -1 });
    await Invoice.collection.createIndex({
      status: 1,
      dueDate: 1
    }); // Compound index for filtering overdue invoices

    // VeriFactu indexes
    await Invoice.collection.createIndex({ verifactuStatus: 1 });
    await Invoice.collection.createIndex({ verifactuId: 1 }, { sparse: true });
    await Invoice.collection.createIndex({ verifactuSentAt: -1 });
    await Invoice.collection.createIndex({
      verifactuStatus: 1,
      verifactuSentAt: -1
    }); // Para queries de facturas pendientes/envío reciente

    // Product indexes
    await Product.collection.createIndex({ name: 1 });
    await Product.collection.createIndex({ createdAt: -1 });

    // Payment indexes
    await Payment.collection.createIndex({ invoice: 1 });
    await Payment.collection.createIndex({ status: 1 });
    await Payment.collection.createIndex({ stripePaymentIntentId: 1 }, { sparse: true });
    await Payment.collection.createIndex({ createdAt: -1 });

    // Recurring Invoice indexes
    await RecurringInvoice.collection.createIndex({ 
      active: 1, 
      nextDueDate: 1 
    }); // Critical for cron job performance
    await RecurringInvoice.collection.createIndex({ client: 1 });
    await RecurringInvoice.collection.createIndex({ createdAt: -1 });

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

/**
 * Drop all indexes (useful for development/testing)
 * WARNING: Use with caution in production
 */
export async function dropIndexes() {
  try {
    console.log('Dropping all indexes...');

    await Client.collection.dropIndexes();
    await Invoice.collection.dropIndexes();
    await Product.collection.dropIndexes();
    await Payment.collection.dropIndexes();
    await RecurringInvoice.collection.dropIndexes();
    await User.collection.dropIndexes();

    console.log('✅ All indexes dropped');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
}

/**
 * List all indexes for a collection
 */
export async function listIndexes(collectionName: string) {
  try {
    const collection = mongoose.connection.collection(collectionName);
    const indexes = await collection.indexes();
    console.log(`Indexes for ${collectionName}:`, indexes);
    return indexes;
  } catch (error) {
    console.error(`Error listing indexes for ${collectionName}:`, error);
    throw error;
  }
}
