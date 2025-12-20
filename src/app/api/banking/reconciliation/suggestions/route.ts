import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import BankTransaction from '@/lib/models/BankTransaction';
import Invoice from '@/lib/models/Invoice';
import BankAccount from '@/lib/models/BankAccount';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * GET /api/banking/reconciliation/suggestions
 * Get matching suggestions for unreconciled transactions
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bankAccountId');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get bank accounts for this company
    const bankAccounts = await BankAccount.find(
      createCompanyFilter(companyId, { userId: session.user.id })
    ).select('_id').lean();
    
    const bankAccountIds = bankAccounts.map(acc => acc._id);
    if (bankAccountIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }
    
    // Filter by specific bank account if provided
    let targetAccountIds = bankAccountIds;
    if (bankAccountId) {
      const accountId = toCompanyObjectId(bankAccountId);
      if (bankAccountIds.some(id => id.toString() === accountId.toString())) {
        targetAccountIds = [accountId];
      } else {
        return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 403 });
      }
    }
    
    // Get unreconciled transactions
    const unreconciledTransactions = await BankTransaction.find({
      bankAccountId: { $in: targetAccountIds },
      reconciled: false,
    })
      .populate('bankAccountId', 'name accountNumber')
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    
    // Get unpaid invoices for matching
    const unpaidInvoices = await Invoice.find(
      createCompanyFilter(companyId, {
        status: { $in: ['sent', 'overdue'] },
        total: { $gt: 0 },
      })
    )
      .populate('client', 'name')
      .lean();
    
    // Generate matching suggestions
    const suggestions = unreconciledTransactions.map(transaction => {
      const matches = unpaidInvoices
        .map(invoice => {
          let score = 0;
          const reasons: string[] = [];
          
          // Amount match (exact)
          const txAmount = transaction.amount || 0;
          const invTotal = invoice.total || 0;
          if (Math.abs(txAmount - invTotal) < 0.01) {
            score += 0.5;
            reasons.push('Coincidencia exacta de monto');
          } else if (invTotal > 0 && Math.abs(txAmount - invTotal) < invTotal * 0.05) {
            score += 0.3;
            reasons.push('Monto similar (diferencia <5%)');
          }
          
          // Date proximity (within 30 days)
          const txDate = transaction.date ? new Date(transaction.date).getTime() : Date.now();
          const invDate = invoice.dueDate || invoice.createdAt;
          if (invDate) {
            const dateDiff = Math.abs(txDate - new Date(invDate).getTime());
            const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
            if (daysDiff <= 7) {
              score += 0.3;
              reasons.push(`Fecha cercana (${Math.round(daysDiff)} días)`);
            } else if (daysDiff <= 30) {
              score += 0.1;
              reasons.push(`Fecha dentro del rango (${Math.round(daysDiff)} días)`);
            }
          }
          
          // Description similarity
          const txDesc = (transaction.description || '').toLowerCase();
          const invoiceNumber = invoice.invoiceNumber?.toString() || '';
          const clientName = (invoice.client as any)?.name?.toLowerCase() || '';
          
          if (invoiceNumber && txDesc.includes(invoiceNumber)) {
            score += 0.2;
            reasons.push('Descripción contiene número de factura');
          } else if (clientName && txDesc.includes(clientName)) {
            score += 0.2;
            reasons.push('Descripción contiene nombre del cliente');
          }
          
          return {
            invoice,
            score,
            reasons,
          };
        })
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Top 3 matches
      
      return {
        transaction: {
          _id: transaction._id?.toString(),
          amount: transaction.amount || 0,
          date: transaction.date || new Date(),
          description: transaction.description || '',
          bankAccount: transaction.bankAccountId || null,
        },
        matches,
      };
    });
    
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    logger.error('Get reconciliation suggestions error', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

