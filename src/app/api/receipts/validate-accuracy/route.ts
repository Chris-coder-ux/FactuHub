import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * GET /api/receipts/validate-accuracy
 * Calcula métricas de precisión OCR para los recibos de la empresa
 */
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
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '80');
    const minAccuracy = parseFloat(searchParams.get('minAccuracy') || '90');
    
    // Get all completed receipts for the company
    const filter = createCompanyFilter(companyId, {
      status: 'completed',
    });
    
    const receipts = await Receipt.find(filter)
      .select('extractedData confidenceScore createdAt')
      .lean();
    
    if (receipts.length === 0) {
      return NextResponse.json({
        message: 'No hay recibos procesados para validar',
        metrics: {
          total: 0,
          averageConfidence: 0,
          averageCompleteness: 0,
          passedRate: 0,
          meetsThreshold: false,
          confidenceRanges: {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
          },
          trend: {
            recentAverage: 0,
            previousAverage: 0,
            change: 0,
            direction: 'stable' as const,
          },
          thresholds: {
            minConfidence,
            minAccuracy,
          },
        },
      });
    }
    
    // Calculate metrics
    const total = receipts.length;
    const confidences = receipts.map(r => r.confidenceScore || 0);
    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / total;
    
    // Count receipts that meet thresholds
    const passedConfidence = receipts.filter(r => (r.confidenceScore || 0) >= minConfidence).length;
    const passedRate = passedConfidence / total;
    
    // Calculate data completeness (how many receipts have all required fields)
    const completeness = receipts.map(receipt => {
      const data = receipt.extractedData || {};
      const hasMerchant = !!data.merchant;
      const hasDate = !!data.date;
      const hasTotal = typeof data.total === 'number';
      const hasTax = typeof data.tax === 'number';
      
      const fieldsPresent = [hasMerchant, hasDate, hasTotal, hasTax].filter(Boolean).length;
      return fieldsPresent / 4; // 4 required fields
    });
    
    const averageCompleteness = completeness.reduce((sum, c) => sum + c, 0) / total;
    
    // Group by confidence ranges
    const confidenceRanges = {
      excellent: receipts.filter(r => (r.confidenceScore || 0) >= 90).length,
      good: receipts.filter(r => (r.confidenceScore || 0) >= 80 && (r.confidenceScore || 0) < 90).length,
      fair: receipts.filter(r => (r.confidenceScore || 0) >= 70 && (r.confidenceScore || 0) < 80).length,
      poor: receipts.filter(r => (r.confidenceScore || 0) < 70).length,
    };
    
    // Calculate trend (last 30 days vs previous 30 days)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(last30Days.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentReceipts = receipts.filter(r => new Date(r.createdAt) >= last30Days);
    const previousReceipts = receipts.filter(
      r => new Date(r.createdAt) >= previous30Days && new Date(r.createdAt) < last30Days
    );
    
    const recentAvgConfidence = recentReceipts.length > 0
      ? recentReceipts.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / recentReceipts.length
      : 0;
    
    const previousAvgConfidence = previousReceipts.length > 0
      ? previousReceipts.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / previousReceipts.length
      : 0;
    
    const confidenceTrend = previousAvgConfidence > 0
      ? ((recentAvgConfidence - previousAvgConfidence) / previousAvgConfidence) * 100
      : 0;
    
    const metrics = {
      total,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      averageCompleteness: Math.round(averageCompleteness * 100) / 100,
      passedRate: Math.round(passedRate * 100) / 100,
      meetsThreshold: averageConfidence >= minConfidence && passedRate >= (minAccuracy / 100),
      confidenceRanges,
      trend: {
        recentAverage: Math.round(recentAvgConfidence * 100) / 100,
        previousAverage: Math.round(previousAvgConfidence * 100) / 100,
        change: Math.round(confidenceTrend * 100) / 100,
        direction: confidenceTrend > 0 ? 'up' : confidenceTrend < 0 ? 'down' : 'stable',
      },
      thresholds: {
        minConfidence,
        minAccuracy,
      },
    };
    
    return NextResponse.json({
      message: 'Métricas de precisión OCR calculadas',
      metrics,
    });
  } catch (error: any) {
    logger.error('Error calculating OCR accuracy', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({
      error: 'Error al calcular métricas de precisión',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}

