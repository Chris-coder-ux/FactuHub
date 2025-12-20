import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import BankTransaction from '@/lib/models/BankTransaction';
import BankAccount from '@/lib/models/BankAccount';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * GET /api/banking/transactions
 * Get bank transactions with filters, pagination, and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const bankAccountId = searchParams.get('bankAccountId');
    const reconciled = searchParams.get('reconciled');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const search = searchParams.get('search');
    
    const { field, order } = validateSortParam(sortParam, ['date', 'amount', 'description', 'createdAt']);
    
    // Build filter
    const filter: any = {};
    
    // Company filter: get all bank accounts for this company
    const bankAccounts = await BankAccount.find(
      createCompanyFilter(companyId, { userId: session.user.id })
    ).select('_id').lean();
    
    const bankAccountIds = bankAccounts.map(acc => acc._id);
    if (bankAccountIds.length === 0) {
      return NextResponse.json(createPaginatedResponse([], 0, { page, limit, skip }));
    }
    
    filter.bankAccountId = { $in: bankAccountIds };
    
    // Filter by specific bank account
    if (bankAccountId) {
      const accountId = toCompanyObjectId(bankAccountId);
      if (bankAccountIds.some(id => id.toString() === accountId.toString())) {
        filter.bankAccountId = accountId;
      } else {
        return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 403 });
      }
    }
    
    // Filter by reconciled status
    if (reconciled === 'true') {
      filter.reconciled = true;
    } else if (reconciled === 'false') {
      filter.reconciled = false;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }
    
    // Filter by amount range
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = parseFloat(maxAmount);
      }
    }
    
    // Search filter (description)
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }
    
    const [transactions, total] = await Promise.all([
      BankTransaction.find(filter)
        .populate('bankAccountId', 'name accountNumber')
        .populate('reconciledInvoiceId', 'invoiceNumber total')
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      BankTransaction.countDocuments(filter)
    ]);
    
    const response = createPaginatedResponse(transactions, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get bank transactions error', error);
    
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

