import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import { syncBankTransactions } from '@/lib/banking/bbva-api';
import BankAccount from '@/lib/models/BankAccount';
import { createCompanyFilter } from '@/lib/mongodb-helpers';

export async function POST(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to sync bank transactions
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();
    const { bankAccountId } = await request.json();
    if (!bankAccountId) {
      return NextResponse.json({ error: 'Bank account ID required' }, { status: 400 });
    }

    // Verify that bankAccountId belongs to the user and company
    const bankAccount = await BankAccount.findOne(createCompanyFilter(companyId, {
      _id: bankAccountId, 
      userId: session.user.id,
    }));
    if (!bankAccount) {
      return NextResponse.json({ error: 'Unauthorized: Bank account not found' }, { status: 403 });
    }

    const result = await syncBankTransactions(bankAccountId);

    if (result.success) {
      return NextResponse.json({
        message: 'Transactions synced successfully',
        transactionsCount: result.transactionsCount,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error syncing transactions:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}