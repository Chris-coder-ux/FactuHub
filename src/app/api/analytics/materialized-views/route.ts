import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { AnalyticsMaterializedViewsService } from '@/lib/services/analytics-materialized-views';
import AnalyticsMaterializedView from '@/lib/models/AnalyticsMaterializedView';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/materialized-views
 * Get status and statistics of materialized views
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

    const isEnabled = process.env.ENABLE_ANALYTICS_MATERIALIZED_VIEWS === 'true';

    // Get all views for this company
    const views = await AnalyticsMaterializedView.find({
      companyId: toCompanyObjectId(companyId),
    })
      .sort({ lastUpdated: -1 })
      .lean();

    // Group by viewType and period
    const viewsByType: Record<string, {
      viewType: string;
      period: string;
      count: number;
      lastUpdated: Date | null;
      oldest: Date | null;
      newest: Date | null;
    }> = {};

    views.forEach((view) => {
      const key = `${view.viewType}_${view.period}`;
      if (!viewsByType[key]) {
        viewsByType[key] = {
          viewType: view.viewType,
          period: view.period,
          count: 0,
          lastUpdated: null,
          oldest: null,
          newest: null,
        };
      }
      viewsByType[key].count++;
      if (!viewsByType[key].lastUpdated || view.lastUpdated > viewsByType[key].lastUpdated!) {
        viewsByType[key].lastUpdated = view.lastUpdated;
      }
      if (!viewsByType[key].oldest || view.lastUpdated < viewsByType[key].oldest!) {
        viewsByType[key].oldest = view.lastUpdated;
      }
      if (!viewsByType[key].newest || view.lastUpdated > viewsByType[key].newest!) {
        viewsByType[key].newest = view.lastUpdated;
      }
    });

    // Calculate statistics
    const totalViews = views.length;
    const expiredViews = views.filter(v => v.expiresAt && new Date(v.expiresAt) < new Date()).length;
    const viewsByTypeArray = Object.values(viewsByType);

    return NextResponse.json({
      enabled: isEnabled,
      totalViews,
      expiredViews,
      activeViews: totalViews - expiredViews,
      viewsByType: viewsByTypeArray,
      lastRefresh: viewsByTypeArray.length > 0 
        ? Math.max(...viewsByTypeArray.map(v => v.lastUpdated ? new Date(v.lastUpdated).getTime() : 0))
        : null,
    });
  } catch (error) {
    logger.error('Error fetching materialized views status', { error });
    return NextResponse.json(
      { error: 'Failed to fetch materialized views status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/materialized-views/refresh
 * Manually refresh all materialized views for the company
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const isEnabled = process.env.ENABLE_ANALYTICS_MATERIALIZED_VIEWS === 'true';
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Materialized views are not enabled. Set ENABLE_ANALYTICS_MATERIALIZED_VIEWS=true' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { viewTypes, period } = body;

    // Generate all views
    if (viewTypes && Array.isArray(viewTypes) && viewTypes.length > 0) {
      // Generate specific view types
      const results = [];
      for (const viewType of viewTypes) {
        try {
          if (viewType === 'client_profitability') {
            await AnalyticsMaterializedViewsService.generateClientProfitability(companyId);
          } else if (viewType === 'product_profitability') {
            await AnalyticsMaterializedViewsService.generateProductProfitability(companyId);
          } else if (viewType === 'trends') {
            await AnalyticsMaterializedViewsService.generateTrends(companyId);
          }
          results.push({ viewType, status: 'success' });
        } catch (error) {
          logger.error(`Error generating ${viewType} view`, { error, companyId });
          results.push({ 
            viewType, 
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return NextResponse.json({ success: true, results });
    } else {
      // Generate all views
      await AnalyticsMaterializedViewsService.generateAllViews(companyId);
      return NextResponse.json({ 
        success: true, 
        message: 'All materialized views refreshed successfully' 
      });
    }
  } catch (error) {
    logger.error('Error refreshing materialized views', { error });
    return NextResponse.json(
      { error: 'Failed to refresh materialized views' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/materialized-views
 * Invalidate (delete) materialized views
 */
export async function DELETE(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const { searchParams } = new URL(request.url);
    const viewTypes = searchParams.get('viewTypes')?.split(',').filter(Boolean);

    await AnalyticsMaterializedViewsService.invalidateViews(companyId, viewTypes);

    return NextResponse.json({ 
      success: true, 
      message: viewTypes 
        ? `Invalidated views: ${viewTypes.join(', ')}`
        : 'All materialized views invalidated'
    });
  } catch (error) {
    logger.error('Error invalidating materialized views', { error });
    return NextResponse.json(
      { error: 'Failed to invalidate materialized views' },
      { status: 500 }
    );
  }
}

