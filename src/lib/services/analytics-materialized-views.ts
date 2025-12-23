/**
 * Service for managing Materialized Views for Analytics
 * Generates and maintains pre-calculated analytics data
 */

import dbConnect from '@/lib/mongodb';
import AnalyticsMaterializedView from '@/lib/models/AnalyticsMaterializedView';
import Invoice from '@/lib/models/Invoice';
import Expense from '@/lib/models/Expense';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { getReadPreference } from '@/lib/mongodb';
import { logger } from '@/lib/logger';

interface MaterializedViewOptions {
  companyId: string;
  viewType: 'client_profitability' | 'product_profitability' | 'cash_flow' | 'trends' | 'summary';
  period: 'daily' | 'monthly' | 'all_time';
  periodKey: string;
  startDate?: Date;
  endDate?: Date;
  maxAge?: number; // Max age in seconds before refresh (default: 1 hour)
}

export class AnalyticsMaterializedViewsService {
  /**
   * Get materialized view data if available and fresh
   */
  static async getView<T>(options: MaterializedViewOptions): Promise<T | null> {
    try {
      await dbConnect();

      const maxAge = options.maxAge || 3600; // Default: 1 hour
      const cutoffTime = new Date(Date.now() - maxAge * 1000);

      const view = await AnalyticsMaterializedView.findOne({
        companyId: toCompanyObjectId(options.companyId),
        viewType: options.viewType,
        period: options.period,
        periodKey: options.periodKey,
        lastUpdated: { $gte: cutoffTime },
      }).lean();

      if (view) {
        logger.debug('Materialized view cache hit', {
          companyId: options.companyId,
          viewType: options.viewType,
          period: options.period,
        });
        return view.data as T;
      }

      return null;
    } catch (error) {
      logger.error('Error getting materialized view', { error, options });
      return null;
    }
  }

  /**
   * Save materialized view data
   */
  static async saveView(options: MaterializedViewOptions, data: unknown): Promise<void> {
    try {
      await dbConnect();

      const expiresAt = options.period === 'daily' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for daily
        : options.period === 'monthly'
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days for monthly
        : undefined; // Never expire for all_time

      await AnalyticsMaterializedView.findOneAndUpdate(
        {
          companyId: toCompanyObjectId(options.companyId),
          viewType: options.viewType,
          period: options.period,
          periodKey: options.periodKey,
        },
        {
          companyId: toCompanyObjectId(options.companyId),
          viewType: options.viewType,
          period: options.period,
          periodKey: options.periodKey,
          data,
          lastUpdated: new Date(),
          expiresAt,
        },
        { upsert: true, new: true }
      );

      logger.debug('Materialized view saved', {
        companyId: options.companyId,
        viewType: options.viewType,
        period: options.period,
      });
    } catch (error) {
      logger.error('Error saving materialized view', { error, options });
      // Don't throw - materialized views are optional
    }
  }

  /**
   * Generate client profitability view
   */
  static async generateClientProfitability(companyId: string, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      await dbConnect();

      const readPref = getReadPreference();
      const companyMatch = createCompanyFilter(companyId);
      const invoiceMatch = {
        ...companyMatch,
        deletedAt: null,
        status: 'paid',
        ...(startDate || endDate ? {
          issuedDate: {
            ...(startDate ? { $gte: startDate } : {}),
            ...(endDate ? { $lte: endDate } : {}),
          },
        } : {}),
      };

      const periodKey = startDate && endDate 
        ? `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`
        : 'all';

      const clientProfitability = await Invoice.aggregate([
        { $match: invoiceMatch },
        {
          $project: {
            client: 1,
            total: 1,
            subtotal: 1,
          },
        },
        {
          $group: {
            _id: '$client',
            totalRevenue: { $sum: '$total' },
            totalCost: { $sum: '$subtotal' },
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
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                },
              },
            ],
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
        { $limit: 50 },
      ]).read(readPref);

      await this.saveView({
        companyId,
        viewType: 'client_profitability',
        period: startDate && endDate ? 'daily' : 'all_time',
        periodKey,
        startDate,
        endDate,
      }, clientProfitability);

      logger.info('Client profitability view generated', { companyId, periodKey });
    } catch (error) {
      logger.error('Error generating client profitability view', { error, companyId });
      throw error;
    }
  }

  /**
   * Generate product profitability view
   */
  static async generateProductProfitability(companyId: string, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      await dbConnect();

      const readPref = getReadPreference();
      const companyMatch = createCompanyFilter(companyId);
      const invoiceMatch = {
        ...companyMatch,
        deletedAt: null,
        status: 'paid',
        ...(startDate || endDate ? {
          issuedDate: {
            ...(startDate ? { $gte: startDate } : {}),
            ...(endDate ? { $lte: endDate } : {}),
          },
        } : {}),
      };

      const periodKey = startDate && endDate 
        ? `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`
        : 'all';

      const productProfitability = await Invoice.aggregate([
        { $match: invoiceMatch },
        {
          $project: {
            _id: 1,
            items: {
              product: 1,
              total: 1,
              quantity: 1,
              price: 1,
            },
          },
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo',
            pipeline: [
              {
                $project: {
                  name: 1,
                },
              },
            ],
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
            invoiceCount: { $addToSet: '$_id' },
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
            estimatedCost: { $multiply: ['$totalRevenue', 0.7] },
            estimatedProfit: { $multiply: ['$totalRevenue', 0.3] },
            margin: 30,
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 50 },
      ]).read(readPref);

      await this.saveView({
        companyId,
        viewType: 'product_profitability',
        period: startDate && endDate ? 'daily' : 'all_time',
        periodKey,
        startDate,
        endDate,
      }, productProfitability);

      logger.info('Product profitability view generated', { companyId, periodKey });
    } catch (error) {
      logger.error('Error generating product profitability view', { error, companyId });
      throw error;
    }
  }

  /**
   * Generate trends view (monthly aggregation)
   */
  static async generateTrends(companyId: string, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      await dbConnect();

      const readPref = getReadPreference();
      const companyMatch = createCompanyFilter(companyId);
      
      const invoiceMatch = {
        ...companyMatch,
        deletedAt: null,
        status: 'paid',
        ...(startDate || endDate ? {
          issuedDate: {
            ...(startDate ? { $gte: startDate } : {}),
            ...(endDate ? { $lte: endDate } : {}),
          },
        } : {}),
      };

      const expenseMatch = {
        ...companyMatch,
        status: { $in: ['approved', 'paid'] },
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { $gte: startDate } : {}),
            ...(endDate ? { $lte: endDate } : {}),
          },
        } : {}),
      };

      const periodKey = startDate && endDate 
        ? `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`
        : 'all';

      const [revenueTrends, expenseTrends] = await Promise.all([
        Invoice.aggregate([
          { $match: invoiceMatch },
          {
            $project: {
              issuedDate: 1,
              total: 1,
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
        ]).read(readPref),
        Expense.aggregate([
          { $match: expenseMatch },
          {
            $project: {
              date: 1,
              amount: 1,
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
        ]).read(readPref),
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

      await this.saveView({
        companyId,
        viewType: 'trends',
        period: startDate && endDate ? 'daily' : 'all_time',
        periodKey,
        startDate,
        endDate,
      }, trends);

      logger.info('Trends view generated', { companyId, periodKey });
    } catch (error) {
      logger.error('Error generating trends view', { error, companyId });
      throw error;
    }
  }

  /**
   * Invalidate views for a company (call after data changes)
   */
  static async invalidateViews(companyId: string, viewTypes?: string[]): Promise<void> {
    try {
      await dbConnect();

      const filter: any = {
        companyId: toCompanyObjectId(companyId),
      };

      if (viewTypes && viewTypes.length > 0) {
        filter.viewType = { $in: viewTypes };
      }

      await AnalyticsMaterializedView.deleteMany(filter);

      logger.info('Materialized views invalidated', { companyId, viewTypes });
    } catch (error) {
      logger.error('Error invalidating views', { error, companyId });
    }
  }

  /**
   * Generate all views for a company
   */
  static async generateAllViews(companyId: string, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      await Promise.all([
        this.generateClientProfitability(companyId, startDate, endDate),
        this.generateProductProfitability(companyId, startDate, endDate),
        this.generateTrends(companyId, startDate, endDate),
      ]);

      logger.info('All materialized views generated', { companyId });
    } catch (error) {
      logger.error('Error generating all views', { error, companyId });
      throw error;
    }
  }
}

