/**
 * Cron job for automated security analysis
 * Analyzes audit logs and creates security alerts for suspicious patterns
 * 
 * Security: Requires CRON_SECRET to be passed in Authorization header
 * Schedule: Run every hour (0 * * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { SecurityAnalysisService } from '@/lib/services/security-analysis-service';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import Company from '@/lib/models/Company';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const startTime = Date.now();
    logger.info('Starting automated security analysis');

    // Obtener todas las empresas activas
    const companies = await Company.find({ deletedAt: { $exists: false } }).lean();
    
    const results = {
      timestamp: new Date().toISOString(),
      companiesAnalyzed: companies.length,
      totalAlertsCreated: 0,
      totalPatternsDetected: 0,
      companyResults: [] as Array<{
        companyId: string;
        alertsCreated: number;
        patternsDetected: number;
      }>,
      errors: [] as string[],
    };

    // Analizar logs por empresa
    for (const company of companies) {
      try {
        const analysisResult = await SecurityAnalysisService.analyzeSecurityLogs(
          company._id.toString()
        );

        results.totalAlertsCreated += analysisResult.alertsCreated;
        results.totalPatternsDetected += analysisResult.patternsDetected.length;
        results.companyResults.push({
          companyId: company._id.toString(),
          alertsCreated: analysisResult.alertsCreated,
          patternsDetected: analysisResult.patternsDetected.length,
        });

        logger.info('Security analysis completed for company', {
          companyId: company._id.toString(),
          alertsCreated: analysisResult.alertsCreated,
          patternsDetected: analysisResult.patternsDetected.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Company ${company._id}: ${errorMessage}`);
        logger.error('Error analyzing security for company', {
          companyId: company._id.toString(),
          error,
        });
      }
    }

    // También analizar logs globales (sin filtro de empresa)
    try {
      const globalAnalysis = await SecurityAnalysisService.analyzeSecurityLogs();
      results.totalAlertsCreated += globalAnalysis.alertsCreated;
      results.totalPatternsDetected += globalAnalysis.patternsDetected.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Global analysis: ${errorMessage}`);
      logger.error('Error in global security analysis', error);
    }

    const duration = Date.now() - startTime;
    logger.info('Automated security analysis completed', {
      duration: `${duration}ms`,
      totalAlertsCreated: results.totalAlertsCreated,
      totalPatternsDetected: results.totalPatternsDetected,
    });

    return NextResponse.json({
      success: true,
      ...results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error('Security analysis cron error', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

