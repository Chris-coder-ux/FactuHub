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
import Expense from './models/Expense';
import { logger } from './logger';

/**
 * Create all necessary indexes for the application
 * This should be called once during application startup
 */
export async function createIndexes() {
  try {
    logger.info('Creating database indexes...');

    // Client indexes
    await Client.collection.createIndex({ email: 1 }, { unique: true });
    await Client.collection.createIndex({ createdAt: -1 });
    await Client.collection.createIndex({ name: 1 });

    // Invoice indexes
    // Remove global unique index on invoiceNumber (replaced by compound unique index)
    // Note: Drop existing unique index manually if it exists: db.invoices.dropIndex("invoiceNumber_1")
    await Invoice.collection.createIndex(
      { companyId: 1, invoiceNumber: 1 }, 
      { unique: true, name: 'companyId_invoiceNumber_unique' }
    );
    await Invoice.collection.createIndex({ client: 1, createdAt: -1 });
    await Invoice.collection.createIndex({ status: 1 });
    await Invoice.collection.createIndex({ dueDate: 1 });
    await Invoice.collection.createIndex({ createdAt: -1 });
    await Invoice.collection.createIndex({
      status: 1,
      dueDate: 1
    }); // Compound index for filtering overdue invoices (legacy, kept for backward compatibility)
    
    // Performance index for overdue invoices with companyId (multi-tenant optimized)
    await Invoice.collection.createIndex(
      { companyId: 1, status: 1, dueDate: 1 },
      { name: 'companyId_status_dueDate' }
    );
    
    // Text index for full-text search in invoices
    // Note: MongoDB allows only one text index per collection
    // This index enables $text queries for searching invoiceNumber and notes
    try {
      await Invoice.collection.createIndex(
        { invoiceNumber: 'text', notes: 'text' },
        { name: 'invoice_text_search', default_language: 'spanish' }
      );
    } catch (error: any) {
      // Text index might already exist, log and continue
      if (!error.message?.includes('already exists')) {
        logger.warn('Failed to create text index for invoices', { error: error.message });
      }
    }

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

    // Expense indexes
    // Performance index for expense reports with sorting by amount
    await Expense.collection.createIndex(
      { companyId: 1, date: -1, amount: -1 },
      { name: 'companyId_date_amount' }
    );

    // Analytics Materialized Views indexes
    const AnalyticsMaterializedView = (await import('./models/AnalyticsMaterializedView')).default;
    await AnalyticsMaterializedView.collection.createIndex(
      { companyId: 1, viewType: 1, period: 1, periodKey: 1 },
      { unique: true, name: 'companyId_viewType_period_periodKey_unique' }
    );
    await AnalyticsMaterializedView.collection.createIndex(
      { companyId: 1, viewType: 1, lastUpdated: -1 },
      { name: 'companyId_viewType_lastUpdated' }
    );
    // TTL index for automatic cleanup of old views
    await AnalyticsMaterializedView.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
    );

    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes', error);
    throw error;
  }
}

/**
 * Drop all indexes (useful for development/testing)
 * WARNING: Use with caution in production
 */
export async function dropIndexes() {
  try {
    logger.info('Dropping all indexes...');

    await Client.collection.dropIndexes();
    await Invoice.collection.dropIndexes();
    await Product.collection.dropIndexes();
    await Payment.collection.dropIndexes();
    await RecurringInvoice.collection.dropIndexes();
    await User.collection.dropIndexes();
    await Expense.collection.dropIndexes();

    logger.info('All indexes dropped');
  } catch (error) {
    logger.error('Error dropping indexes', error);
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
    logger.info(`Indexes for ${collectionName}`, { indexes, collectionName });
    return indexes;
  } catch (error) {
    logger.error(`Error listing indexes for ${collectionName}`, { error, collectionName });
    throw error;
  }
}
