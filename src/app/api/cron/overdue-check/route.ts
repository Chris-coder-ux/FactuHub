import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { env } from '@/lib/env';
import { notificationService } from '@/lib/notifications';

/**
 * Cron job to check for overdue invoices and send notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Mark 'sent' invoices as 'overdue' if dueDate passed
    const overdueResult = await Invoice.updateMany(
      {
        status: 'sent',
        dueDate: { $lt: today }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    // 2. Find all 'overdue' invoices to send notifications
    // We might want to track if a notification was already sent to avoid spamming
    // For this MVP, we'll just log the action
    const overdueInvoices = await Invoice.find({ status: 'overdue' }).populate('client');

    const notificationResults = [];
    for (const invoice of overdueInvoices) {
      if (invoice.client?.email) {
        await notificationService.sendOverdueNotification(invoice, invoice.client);
        notificationResults.push({
          invoiceNumber: invoice.invoiceNumber,
          client: invoice.client.name,
          email: invoice.client.email
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: today.toISOString(),
      updatedToOverdue: overdueResult.modifiedCount,
      notificationsSent: notificationResults.length,
      details: notificationResults
    });

  } catch (error) {
    console.error('Overdue check cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
