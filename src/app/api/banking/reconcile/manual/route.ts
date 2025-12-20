import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import BankTransaction from '@/lib/models/BankTransaction';
import Invoice from '@/lib/models/Invoice';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/banking/reconcile/manual
 * Manually reconcile a single transaction with an invoice
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    await connectDB();
    
    const { transactionId, invoiceId } = await request.json();
    
    if (!transactionId || !invoiceId) {
      return NextResponse.json(
        { error: 'transactionId and invoiceId are required' },
        { status: 400 }
      );
    }

    // Get transaction and verify it belongs to company
    const transaction = await BankTransaction.findById(transactionId)
      .populate('bankAccountId');
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const bankAccount = transaction.bankAccountId as any;
    if (bankAccount.companyId?.toString() !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get invoice and verify it belongs to company
    const invoice = await Invoice.findOne(
      createCompanyFilter(companyId, { _id: invoiceId })
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Reconcile
    transaction.reconciled = true;
    transaction.reconciledInvoiceId = toCompanyObjectId(invoiceId);
    await transaction.save();

    // Update invoice status if not already paid
    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      await invoice.save();
    }

    logger.info('Transaction manually reconciled', {
      transactionId,
      invoiceId,
      companyId,
      userId: session.user.id,
    });

    return NextResponse.json({
      message: 'Transaction reconciled successfully',
      transaction: {
        _id: transaction._id,
        reconciled: transaction.reconciled,
        reconciledInvoiceId: transaction.reconciledInvoiceId,
      },
    });
  } catch (error: any) {
    logger.error('Manual reconciliation error', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}

