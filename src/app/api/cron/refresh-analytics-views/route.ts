import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Company from '@/lib/models/Company';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { AnalyticsMaterializedViewsService } from '@/lib/services/analytics-materialized-views';

/**
 * Cron job to refresh materialized analytics views
 * Runs periodically to keep pre-calculated analytics data fresh
 * 
 * Schedule: Every hour (configurable via CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if materialized views are enabled
    if (process.env.ENABLE_ANALYTICS_MATERIALIZED_VIEWS !== 'true') {
      return NextResponse.json({ 
        message: 'Materialized views are disabled',
        skipped: true 
      });
    }

    await dbConnect();
    
    // Get all companies
    const companies = await Company.find({}).select('_id').lean();
    
    const results = [];
    
    // Refresh views for all companies
    for (const company of companies) {
      const companyId = company._id.toString();
      
      try {
        // Generate all-time views (most commonly accessed)
        await AnalyticsMaterializedViewsService.generateAllViews(companyId);
        
        // Generate monthly views for current and previous month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        await AnalyticsMaterializedViewsService.generateAllViews(
          companyId,
          currentMonthStart,
          now
        );
        
        await AnalyticsMaterializedViewsService.generateAllViews(
          companyId,
          previousMonthStart,
          previousMonthEnd
        );
        
        results.push({
          companyId,
          status: 'success',
        });
      } catch (error) {
        logger.error('Error refreshing views for company', { 
          companyId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        results.push({
          companyId,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    logger.info('Analytics views refresh completed', {
      total: companies.length,
      success: successCount,
      errors: errorCount,
    });
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: companies.length,
      successCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    logger.error('Analytics views refresh cron error', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Force dynamic rendering since this route uses request.headers
export const dynamic = 'force-dynamic';

