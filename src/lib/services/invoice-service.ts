import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Client from '@/lib/models/Client';
import Product from '@/lib/models/Product';
import Counter from '@/lib/models/Counter';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import { invoiceSchema } from '@/lib/validations';
import { z } from 'zod';
import mongoose from 'mongoose';
import { sanitizeObject } from '@/lib/sanitization';

export class InvoiceService {
  /**
   * Creates a new invoice with proper company isolation
   * Uses MongoDB transactions to ensure atomicity
   */
  static async createInvoice(
    companyId: string,
    invoiceData: z.infer<typeof invoiceSchema>
  ) {
    await dbConnect();

    // Sanitize input data to prevent XSS attacks
    const sanitizedData = sanitizeObject(invoiceData);

    // Verify client belongs to the same company (outside transaction for early validation)
    const client = await Client.findById(sanitizedData.client);
    if (!client) {
      throw new Error('Client not found');
    }
    if (client.companyId && client.companyId.toString() !== companyId) {
      throw new Error('Client does not belong to your company');
    }

    // Verify each product belongs to the same company to prevent data leakage
    for (const item of sanitizedData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product ${item.product} not found`);
      }
      if (product.companyId && product.companyId.toString() !== companyId) {
        throw new Error(`Product ${item.product} does not belong to your company`);
      }
    }

    // Start MongoDB transaction for atomic operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Use atomic counter per company to prevent race conditions and data leakage
      // Counter ID format: invoiceNumber_{companyId} to ensure isolation between companies
      const counterId = `invoiceNumber_${companyId}`;
      const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );

      const invoiceNumber = `INV-${String(counter.seq).padStart(4, '0')}`;

      const invoice = new Invoice({
        ...sanitizedData,
        invoiceNumber,
        issuedDate: new Date(),
        status: 'draft',
        companyId: toCompanyObjectId(companyId),
      });

      // Save invoice within transaction
      await invoice.save({ session });

      // Commit transaction before populating (populate doesn't work with sessions)
      await session.commitTransaction();

      // Populate after transaction commit
      await invoice.populate('client').populate('items.product');

      logger.info('Invoice created successfully', {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        companyId,
      });

      return invoice;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      logger.error('Invoice creation transaction failed', {
        error: error instanceof Error ? error.message : String(error),
        companyId,
      });
      throw error;
    } finally {
      // Always end session
      session.endSession();
    }
  }

  /**
   * Checks if an invoice should be processed with VeriFactu
   */
  static shouldProcessVeriFactu(invoice: any, settings: any): boolean {
    // Check if client is Spanish (ES country or Spanish tax ID format)
    const isSpanishClient =
      invoice.client.address?.country === 'ES' ||
      (invoice.client.taxId && /^[A-Z]\d{7}[A-Z0-9]$/.test(invoice.client.taxId));

    // Auto-enable VeriFactu for Spanish clients if settings allow it
    return (
      settings?.verifactuEnabled ||
      (settings?.verifactuAutoEnableForSpain && isSpanishClient)
    );
  }
}

