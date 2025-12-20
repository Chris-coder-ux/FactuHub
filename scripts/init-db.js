#!/usr/bin/env node
/* eslint-env node */

/**
 * Database initialization script
 * Run this script to create all necessary indexes
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

async function createIndexes() {
  try {
    console.log('Creating database indexes...');

    const db = mongoose.connection.db;

    // Client indexes
    console.log('📝 Creating Client indexes...');
    await db.collection('clients').createIndex({ email: 1 }, { unique: true });
    await db.collection('clients').createIndex({ createdAt: -1 });
    await db.collection('clients').createIndex({ name: 1 });

    // Invoice indexes
    console.log('📝 Creating Invoice indexes...');
    await db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true });
    await db.collection('invoices').createIndex({ client: 1, createdAt: -1 });
    await db.collection('invoices').createIndex({ status: 1 });
    await db.collection('invoices').createIndex({ dueDate: 1 });
    await db.collection('invoices').createIndex({ createdAt: -1 });
    await db.collection('invoices').createIndex({ status: 1, dueDate: 1 });

    // Product indexes
    console.log('📝 Creating Product indexes...');
    await db.collection('products').createIndex({ name: 1 });
    await db.collection('products').createIndex({ createdAt: -1 });

    // Payment indexes
    console.log('📝 Creating Payment indexes...');
    await db.collection('payments').createIndex({ invoice: 1 });
    await db.collection('payments').createIndex({ status: 1 });
    await db.collection('payments').createIndex({ stripePaymentIntentId: 1 }, { sparse: true });
    await db.collection('payments').createIndex({ createdAt: -1 });

    // Recurring Invoice indexes
    console.log('📝 Creating RecurringInvoice indexes...');
    await db.collection('recurringinvoices').createIndex({ active: 1, nextDueDate: 1 });
    await db.collection('recurringinvoices').createIndex({ client: 1 });
    await db.collection('recurringinvoices').createIndex({ createdAt: -1 });

    // User indexes
    console.log('� Creating User indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });

    // Counter index (for invoice numbers)
    console.log('📝 Creating Counter indexes...');
    await db.collection('counters').createIndex({ _id: 1 }, { unique: true });

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('�🚀 Starting database initialization...\n');

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create indexes
    await createIndexes();

    console.log('\n✅ Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
