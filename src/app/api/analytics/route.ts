import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Expense from '@/lib/models/Expense';
import Product from '@/lib/models/Product';
import Client from '@/lib/models/Client';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics
 * Advanced analytics: profitability by client/product, cash flow, trends
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }
    
    const companyMatch = createCompanyFilter(companyId);
    const invoiceMatch = {
      ...companyMatch,
      deletedAt: null,
      ...(Object.keys(dateFilter).length > 0 && { issuedDate: dateFilter }),
    };
    
    const expenseMatch = {
      ...companyMatch,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };
    
    // 1. Profitability by Client
    const clientProfitability = await Invoice.aggregate([
      { $match: { ...invoiceMatch, status: 'paid' } },
      {
        $group: {
          _id: '$client',
          totalRevenue: { $sum: '$total' },
          totalCost: { $sum: '$subtotal' }, // Simplified: subtotal as cost
          invoiceCount: { $sum: 1 },
          averageInvoiceValue: { $avg: '$total' },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo',
        },
      },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          clientId: '$_id',
          clientName: { $ifNull: ['$clientInfo.name', 'Cliente eliminado'] },
          clientEmail: { $ifNull: ['$clientInfo.email', ''] },
          totalRevenue: 1,
          totalCost: 1,
          profit: { $subtract: ['$totalRevenue', '$totalCost'] },
          margin: {
            $cond: {
              if: { $gt: ['$totalRevenue', 0] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] },
                  100,
                ],
              },
              else: 0,
            },
          },
          invoiceCount: 1,
          averageInvoiceValue: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 }, // Top 50 clients
    ]);
    
    // 2. Profitability by Product
    const productProfitability = await Invoice.aggregate([
      { $match: { ...invoiceMatch, status: 'paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: { $ifNull: ['$productInfo.name', 'Producto eliminado'] } },
          totalRevenue: { $sum: '$items.total' },
          totalQuantity: { $sum: '$items.quantity' },
          averagePrice: { $avg: '$items.price' },
          invoiceCount: { $addToSet: '$_id' }, // Unique invoices
        },
      },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          totalRevenue: 1,
          totalQuantity: 1,
          averagePrice: 1,
          invoiceCount: { $size: '$invoiceCount' },
          // Simplified profit calculation (assuming 30% margin on average)
          estimatedCost: { $multiply: ['$totalRevenue', 0.7] },
          estimatedProfit: { $multiply: ['$totalRevenue', 0.3] },
          margin: 30, // Simplified
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 }, // Top 50 products
    ]);
    
    // 3. Cash Flow
    const cashFlowIn = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$issuedDate' },
            month: { $month: '$issuedDate' },
            day: { $dayOfMonth: '$issuedDate' },
          },
          total: { $sum: '$total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    
    const cashFlowOut = await Expense.aggregate([
      {
        $match: {
          ...expenseMatch,
          status: { $in: ['approved', 'paid'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    
    // Combine cash flow data
    const cashFlowMap = new Map<string, { in: number; out: number; net: number; date: string }>();
    
    cashFlowIn.forEach((item) => {
      const dateKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      const existing = cashFlowMap.get(dateKey) || { in: 0, out: 0, net: 0, date: dateKey };
      existing.in += item.total;
      existing.net = existing.in - existing.out;
      cashFlowMap.set(dateKey, existing);
    });
    
    cashFlowOut.forEach((item) => {
      const dateKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      const existing = cashFlowMap.get(dateKey) || { in: 0, out: 0, net: 0, date: dateKey };
      existing.out += item.total;
      existing.net = existing.in - existing.out;
      cashFlowMap.set(dateKey, existing);
    });
    
    const cashFlow = Array.from(cashFlowMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // 4. Trends (monthly revenue, expenses, profit)
    const revenueTrends = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$issuedDate' },
            month: { $month: '$issuedDate' },
          },
          revenue: { $sum: '$total' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    
    const expenseTrends = await Expense.aggregate([
      {
        $match: {
          ...expenseMatch,
          status: { $in: ['approved', 'paid'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          expenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    
    // Combine trends
    const trendsMap = new Map<string, { month: string; revenue: number; expenses: number; profit: number; invoiceCount: number; expenseCount: number }>();
    
    revenueTrends.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const existing = trendsMap.get(monthKey) || {
        month: monthKey,
        revenue: 0,
        expenses: 0,
        profit: 0,
        invoiceCount: 0,
        expenseCount: 0,
      };
      existing.revenue += item.revenue;
      existing.invoiceCount += item.invoiceCount;
      existing.profit = existing.revenue - existing.expenses;
      trendsMap.set(monthKey, existing);
    });
    
    expenseTrends.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const existing = trendsMap.get(monthKey) || {
        month: monthKey,
        revenue: 0,
        expenses: 0,
        profit: 0,
        invoiceCount: 0,
        expenseCount: 0,
      };
      existing.expenses += item.expenses;
      existing.expenseCount += item.expenseCount;
      existing.profit = existing.revenue - existing.expenses;
      trendsMap.set(monthKey, existing);
    });
    
    const trends = Array.from(trendsMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    // 5. Summary metrics
    const totalRevenue = clientProfitability.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalExpenses = cashFlow.reduce((sum, c) => sum + c.out, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const averageMargin = clientProfitability.length > 0
      ? clientProfitability.reduce((sum, c) => sum + c.margin, 0) / clientProfitability.length
      : 0;
    
    return NextResponse.json({
      clientProfitability,
      productProfitability,
      cashFlow,
      trends,
      summary: {
        totalRevenue,
        totalExpenses,
        totalProfit,
        averageMargin,
        clientCount: clientProfitability.length,
        productCount: productProfitability.length,
      },
    });
  } catch (error: any) {
    logger.error('Get analytics error', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json(
      { message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

