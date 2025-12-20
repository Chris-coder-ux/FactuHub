import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import BankAccount from '@/lib/models/BankAccount';
import { createCompanyFilter } from '@/lib/mongodb-helpers';

export async function GET() {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view bank accounts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();

    // Filter by companyId for data isolation
    const bankAccounts = await BankAccount.find(createCompanyFilter(companyId, {
      userId: session.user.id,
    }));

    return NextResponse.json({ data: bankAccounts });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    
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