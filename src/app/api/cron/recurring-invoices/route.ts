import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RecurringInvoice from '@/lib/models/RecurringInvoice';
import Invoice from '@/lib/models/Invoice';
import { env } from '@/lib/env';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

/**
 * Cron job endpoint for processing recurring invoices
 * This should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * Security: Requires CRON_SECRET to be passed in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active recurring invoices that are due
    const recurringInvoices = await RecurringInvoice.find({
      active: true,
      nextDueDate: { $lte: today },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: today } }
      ]
    }).populate('client').populate('items.product');

    const results = {
      processed: 0,
      created: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const recurring of recurringInvoices) {
      try {
        results.processed++;

        // Get companyId from the client to ensure proper isolation
        const Client = (await import('@/lib/models/Client')).default;
        const client = await Client.findById(recurring.client._id);
        if (!client || !client.companyId) {
          throw new Error(`Client ${recurring.client._id} not found or missing companyId`);
        }
        const companyId = client.companyId.toString();

        // Use atomic counter per company to prevent race conditions and data leakage
        // Counter ID format: invoiceNumber_{companyId} to ensure isolation between companies
        const Counter = (await import('@/lib/models/Counter')).default;
        const counterId = `invoiceNumber_${companyId}`;
        const counter = await Counter.findOneAndUpdate(
          { _id: counterId },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        
        const invoiceNumber = `INV-${String(counter.seq).padStart(4, '0')}`;

        // Create new invoice from recurring template with companyId
        const newInvoice = new Invoice({
          invoiceNumber,
          client: recurring.client._id,
          items: recurring.items,
          subtotal: recurring.items.reduce((sum: number, item: { total: number }) => sum + item.total, 0),
          tax: recurring.items.reduce((sum: number, item: { tax: number }) => sum + item.tax, 0),
          total: recurring.items.reduce((sum: number, item: { total: number, tax: number }) => sum + item.total + item.tax, 0),
          status: 'draft',
          dueDate: recurring.nextDueDate,
          issuedDate: new Date(),
          notes: `Factura recurrente generada automáticamente desde ${recurring.invoiceNumber}`,
          companyId: toCompanyObjectId(companyId), // Assign companyId to invoice
        });

        await newInvoice.save();
        results.created++;

        // Calculate next due date based on frequency
        const nextDueDate = new Date(recurring.nextDueDate);
        switch (recurring.frequency) {
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
        }

        // Update recurring invoice with next due date
        recurring.nextDueDate = nextDueDate;
        
        // Check if we should deactivate (past end date)
        if (recurring.endDate && nextDueDate > recurring.endDate) {
          recurring.active = false;
        }

        await recurring.save();

        results.details.push({
          recurringInvoiceId: recurring._id,
          newInvoiceNumber: invoiceNumber,
          nextDueDate: nextDueDate.toISOString(),
          active: recurring.active
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          recurringInvoiceId: recurring._id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Error processing recurring invoice ${recurring._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });

  } catch (error) {
    console.error('Recurring invoices cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
