import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import FiscalProjection from '@/lib/models/FiscalProjection';
import Invoice from '@/lib/models/Invoice';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

interface AccuracyMetrics {
  overall: {
    averageAccuracy: number;
    totalProjections: number;
    passedThreshold: number;
    passedRate: number;
  };
  iva: {
    averageAccuracy: number;
    quarterlyAccuracy: Array<{
      quarter: number;
      accuracy: number;
      projected: number;
      actual: number;
    }>;
  };
  irpf: {
    accuracy: number;
    projected: number;
    actual: number;
  };
  byYear: Record<number, {
    iva: number;
    irpf: number;
  }>;
}

/**
 * GET /api/fiscal/accuracy
 * Calculate accuracy metrics for fiscal projections
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const threshold = parseFloat(searchParams.get('threshold') || '85');

    // Get projections with actual amounts
    const projections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year,
      })
    ).lean();

    // Get invoices for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const invoices = await Invoice.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        createdAt: { $gte: yearStart, $lte: yearEnd },
        status: { $in: ['sent', 'paid', 'overdue'] },
      })
    ).lean();

    // Calculate actual IVA by quarter
    const actualIVA: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    invoices.forEach(invoice => {
      const invoiceDate = invoice.createdAt || invoice.issuedDate || invoice.date;
      if (!invoiceDate) return;
      
      const invoiceMonth = new Date(invoiceDate).getMonth();
      const quarter = Math.floor(invoiceMonth / 3) + 1;
      
      const invoiceIVA = invoice.items?.reduce((sum: number, item: any) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        const taxRate = item.taxRate || 0;
        return sum + (itemTotal * taxRate / 100);
      }, 0) || 0;
      
      if (quarter >= 1 && quarter <= 4) {
        actualIVA[quarter] += invoiceIVA;
      }
    });

    // Calculate actual IRPF (simplified: 20% of revenue)
    const actualIRPF = invoices.reduce((sum, inv) => {
      return sum + (inv.total * 0.20);
    }, 0);

    // Calculate accuracy for each projection
    const ivaProjections = projections.filter(p => p.type === 'iva' && p.quarter);
    const irpfProjection = projections.find(p => p.type === 'irpf' && !p.quarter);

    const quarterlyAccuracy = ivaProjections.map(proj => {
      if (!proj.quarter) return null;
      const actual = actualIVA[proj.quarter] || 0;
      const projected = proj.projectedAmount || 0;
      const difference = Math.abs(projected - actual);
      const accuracy = actual > 0
        ? Math.max(0, 100 - (difference / actual) * 100)
        : projected === 0 ? 100 : 0;

      return {
        quarter: proj.quarter,
        accuracy,
        projected,
        actual,
      };
    }).filter((a): a is NonNullable<typeof a> => a !== null);

    const ivaAverageAccuracy = quarterlyAccuracy.length > 0
      ? quarterlyAccuracy.reduce((sum, q) => sum + q.accuracy, 0) / quarterlyAccuracy.length
      : 0;

    const irpfAccuracy = irpfProjection
      ? (() => {
          const projected = irpfProjection.projectedAmount || 0;
          const difference = Math.abs(projected - actualIRPF);
          return actualIRPF > 0
            ? Math.max(0, 100 - (difference / actualIRPF) * 100)
            : projected === 0 ? 100 : 0;
        })()
      : 0;

    // Overall metrics
    const allAccuracies = [
      ...quarterlyAccuracy.map(q => q.accuracy),
      ...(irpfProjection ? [irpfAccuracy] : []),
    ];

    const overallAverageAccuracy = allAccuracies.length > 0
      ? allAccuracies.reduce((sum, a) => sum + a, 0) / allAccuracies.length
      : 0;

    const passedThreshold = allAccuracies.filter(a => a >= threshold).length;
    const passedRate = allAccuracies.length > 0
      ? (passedThreshold / allAccuracies.length) * 100
      : 0;

    const metrics: AccuracyMetrics = {
      overall: {
        averageAccuracy: overallAverageAccuracy,
        totalProjections: allAccuracies.length,
        passedThreshold,
        passedRate,
      },
      iva: {
        averageAccuracy: ivaAverageAccuracy,
        quarterlyAccuracy,
      },
      irpf: {
        accuracy: irpfAccuracy,
        projected: irpfProjection?.projectedAmount || 0,
        actual: actualIRPF,
      },
      byYear: {
        [year]: {
          iva: ivaAverageAccuracy,
          irpf: irpfAccuracy,
        },
      },
    };

    return NextResponse.json({
      metrics,
      threshold,
      meetsThreshold: overallAverageAccuracy >= threshold,
    });
  } catch (error: any) {
    logger.error('Error calculating fiscal accuracy', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

