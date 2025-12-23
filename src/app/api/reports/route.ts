import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { getReadPreference } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Client from '@/lib/models/Client';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { createCompanyFilter } from '@/lib/mongodb-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view reports
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );
    
    await dbConnect();
    
    // Use read preference for read-only report queries (can use read replicas)
    const readPref = getReadPreference();
    
    // Base match filter for company isolation
    const companyMatch = createCompanyFilter(companyId);
    
    const [
      totalRevenueResult,
      pendingRevenueResult,
      overdueRevenueResult,
      clientCount,
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
      monthlyRevenue,
      recentInvoices,
      revenueDataResult,
      statusDistributionResult
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...companyMatch, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).read(readPref),
      Invoice.aggregate([
        { $match: { ...companyMatch, status: { $in: ['sent', 'draft'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).read(readPref),
      Invoice.aggregate([
        { $match: { ...companyMatch, status: 'overdue' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).read(readPref),
      Client.countDocuments({ ...companyMatch, deletedAt: null }).read(readPref),
      Invoice.countDocuments({ ...companyMatch, status: { $in: ['draft', 'sent'] } }).read(readPref),
      Invoice.countDocuments({ ...companyMatch, status: 'overdue' }).read(readPref),
      Invoice.countDocuments({ ...companyMatch, status: 'paid' }).read(readPref),
      Invoice.aggregate([
        { 
          $match: { 
            ...companyMatch,
            status: 'paid',
            issuedDate: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).read(readPref),
      Invoice.find(companyMatch)
        .populate('client', 'name email')
        .read(readPref)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Invoice.aggregate([
        { $match: { ...companyMatch, status: 'paid' } },
        {
          $group: {
            _id: {
              year: { $year: '$issuedDate' },
              month: { $month: '$issuedDate' }
            },
            total: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).read(readPref),
      Invoice.aggregate([
        { $match: companyMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).read(readPref)
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const pendingRevenue = pendingRevenueResult[0]?.total || 0;
    const overdueRevenue = overdueRevenueResult[0]?.total || 0;
    const monthlyRevenueTotal = monthlyRevenue[0]?.total || 0;

    return NextResponse.json({
      totalRevenue,
      pendingRevenue,
      overdueRevenue,
      clientCount,
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
      monthlyRevenue: monthlyRevenueTotal,
      recentInvoices,
      revenueData: revenueDataResult,
      statusDistribution: statusDistributionResult
    });
  } catch (error: any) {
    console.error('Get reports error:', error);
    
    // Handle permission errors
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
