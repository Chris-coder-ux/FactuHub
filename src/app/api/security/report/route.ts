/**
 * Security Report API Endpoint
 * GET: Generate security analysis report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SecurityAnalysisService } from '@/lib/services/security-analysis-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/security/report
 * Generates a security analysis report for the specified time range
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días por defecto
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date();

    // Ejecutar análisis de seguridad
    const analysisResult = await SecurityAnalysisService.analyzeSecurityLogs(
      session.user.companyId,
      { startDate, endDate }
    );

    // Obtener alertas no resueltas
    const { alerts } = await SecurityAnalysisService.getAlerts(
      session.user.companyId,
      {
        acknowledged: false,
        startDate,
        endDate,
        limit: 100,
      }
    );

    // Obtener alertas críticas
    const { alerts: criticalAlerts } = await SecurityAnalysisService.getAlerts(
      session.user.companyId,
      {
        severity: 'critical',
        acknowledged: false,
        startDate,
        endDate,
        limit: 50,
      }
    );

    return NextResponse.json({
      success: true,
      report: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: analysisResult.summary,
        patternsDetected: analysisResult.patternsDetected,
        alerts: {
          total: alerts.length,
          critical: criticalAlerts.length,
          unacknowledged: alerts.filter(a => !a.acknowledged).length,
        },
        topAlerts: alerts.slice(0, 10),
        criticalAlerts: criticalAlerts.slice(0, 10),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating security report', error);
    return NextResponse.json(
      { error: 'Failed to generate security report' },
      { status: 500 }
    );
  }
}

