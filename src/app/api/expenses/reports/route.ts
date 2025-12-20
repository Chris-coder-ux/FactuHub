import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    
    // Build filter
    const filter: any = createCompanyFilter(companyId, {});
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (category) {
      filter.category = category;
    }
    
    // Get expenses
    const expenses = await Expense.find(filter)
      .populate('receiptIds')
      .sort({ date: -1 })
      .lean();
    
    // Aggregate by category
    const byCategory = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          taxTotal: { $sum: '$taxAmount' }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Aggregate by status
    const byStatus = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Aggregate by month
    const byMonth = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          taxTotal: { $sum: '$taxAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Calculate totals
    const totals = expenses.reduce((acc, expense) => ({
      total: acc.total + expense.amount,
      taxTotal: acc.taxTotal + expense.taxAmount,
      count: acc.count + 1
    }), { total: 0, taxTotal: 0, count: 0 });
    
    return NextResponse.json({
      expenses,
      summary: {
        totals,
        byCategory,
        byStatus,
        byMonth
      }
    });
  } catch (error: any) {
    logger.error('Get expense reports error', error);
    
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

