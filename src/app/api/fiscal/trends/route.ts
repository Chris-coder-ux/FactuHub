import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import FiscalProjection from '@/lib/models/FiscalProjection';
import Invoice from '@/lib/models/Invoice';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * GET /api/fiscal/trends
 * Get fiscal trends data for advanced charts and year-over-year comparison
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
    const years = searchParams.get('years')?.split(',').map(y => parseInt(y)) || [];
    const type = searchParams.get('type'); // 'iva' or 'irpf' or 'all'
    const currentYear = new Date().getFullYear();
    
    // Default to last 3 years if not specified
    const targetYears = years.length > 0 
      ? years 
      : [currentYear - 2, currentYear - 1, currentYear];

    // Get projections for all requested years
    const projections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year: { $in: targetYears },
        ...(type && type !== 'all' ? { type } : {}),
      })
    )
      .sort({ year: 1, quarter: 1 })
      .lean();

    // Get actual invoice data for comparison
    const invoices = await Invoice.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        status: { $in: ['sent', 'paid', 'overdue'] },
        createdAt: {
          $gte: new Date(Math.min(...targetYears), 0, 1),
          $lte: new Date(Math.max(...targetYears), 11, 31),
        },
      })
    )
      .lean();

    // Process IVA data
    const ivaData = processIVAProjections(projections.filter(p => p.type === 'iva'), invoices, targetYears);
    
    // Process IRPF data
    const irpfData = processIRPFProjections(projections.filter(p => p.type === 'irpf'), invoices, targetYears);

    // Calculate year-over-year growth
    const yoyGrowth = calculateYearOverYearGrowth(ivaData, irpfData, targetYears);

    // Calculate trends
    const trends = calculateTrends(ivaData, irpfData, targetYears);

    return NextResponse.json({
      iva: ivaData,
      irpf: irpfData,
      yearOverYear: yoyGrowth,
      trends,
      years: targetYears,
    });
  } catch (error: any) {
    logger.error('Error fetching fiscal trends', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function processIVAProjections(projections: any[], invoices: any[], years: number[]) {
  const quarterlyData: Record<number, Record<number, { projected: number; actual: number }>> = {};
  
  // Initialize structure
  years.forEach(year => {
    quarterlyData[year] = { 1: { projected: 0, actual: 0 }, 2: { projected: 0, actual: 0 }, 3: { projected: 0, actual: 0 }, 4: { projected: 0, actual: 0 } };
  });

  // Fill with projections
  projections.forEach(proj => {
    if (proj.quarter && quarterlyData[proj.year]?.[proj.quarter]) {
      quarterlyData[proj.year][proj.quarter].projected = proj.projectedAmount || 0;
      quarterlyData[proj.year][proj.quarter].actual = proj.actualAmount || 0;
    }
  });

  // Calculate actual IVA from invoices
  invoices.forEach(invoice => {
    const invoiceYear = new Date(invoice.createdAt).getFullYear();
    const invoiceMonth = new Date(invoice.createdAt).getMonth();
    const quarter = Math.floor(invoiceMonth / 3) + 1;
    
    if (years.includes(invoiceYear) && quarterlyData[invoiceYear]?.[quarter]) {
      // Calculate IVA from invoice items
      const invoiceIVA = invoice.items?.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity * (item.taxRate || 0) / 100);
      }, 0) || 0;
      
      quarterlyData[invoiceYear][quarter].actual += invoiceIVA;
    }
  });

  // Convert to array format for charts
  const chartData: Array<{
    year: number;
    quarter: number;
    period: string;
    projected: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }> = [];

  years.forEach(year => {
    [1, 2, 3, 4].forEach(quarter => {
      const data = quarterlyData[year][quarter];
      const variance = data.actual - data.projected;
      const variancePercent = data.projected > 0 ? (variance / data.projected) * 100 : 0;
      
      chartData.push({
        year,
        quarter,
        period: `${year}-Q${quarter}`,
        projected: data.projected,
        actual: data.actual,
        variance,
        variancePercent,
      });
    });
  });

  return chartData;
}

function processIRPFProjections(projections: any[], invoices: any[], years: number[]) {
  const annualData: Record<number, { projected: number; actual: number }> = {};
  
  // Initialize
  years.forEach(year => {
    annualData[year] = { projected: 0, actual: 0 };
  });

  // Fill with projections
  projections.forEach(proj => {
    if (!proj.quarter && annualData[proj.year]) {
      annualData[proj.year].projected = proj.projectedAmount || 0;
      annualData[proj.year].actual = proj.actualAmount || 0;
    }
  });

  // Convert to array format
  return years.map(year => {
    const data = annualData[year];
    const variance = data.actual - data.projected;
    const variancePercent = data.projected > 0 ? (variance / data.projected) * 100 : 0;
    
    return {
      year,
      projected: data.projected,
      actual: data.actual,
      variance,
      variancePercent,
    };
  });
}

function calculateYearOverYearGrowth(ivaData: any[], irpfData: any[], years: number[]) {
  const sortedYears = [...years].sort();
  const growth: Record<string, { iva: number; irpf: number }> = {};

  for (let i = 1; i < sortedYears.length; i++) {
    const currentYear = sortedYears[i];
    const previousYear = sortedYears[i - 1];
    
    // IVA: Compare total annual
    const currentIVA = ivaData
      .filter(d => d.year === currentYear)
      .reduce((sum, d) => sum + d.actual, 0);
    const previousIVA = ivaData
      .filter(d => d.year === previousYear)
      .reduce((sum, d) => sum + d.actual, 0);
    
    const ivaGrowth = previousIVA > 0 ? ((currentIVA - previousIVA) / previousIVA) * 100 : 0;
    
    // IRPF: Compare annual
    const currentIRPF = irpfData.find(d => d.year === currentYear)?.actual || 0;
    const previousIRPF = irpfData.find(d => d.year === previousYear)?.actual || 0;
    const irpfGrowth = previousIRPF > 0 ? ((currentIRPF - previousIRPF) / previousIRPF) * 100 : 0;
    
    growth[`${previousYear}-${currentYear}`] = {
      iva: ivaGrowth,
      irpf: irpfGrowth,
    };
  }

  return growth;
}

function calculateTrends(ivaData: any[], irpfData: any[], years: number[]) {
  const sortedYears = [...years].sort();
  
  // Calculate average quarterly IVA
  const quarterlyAverages = sortedYears.map(year => {
    const yearData = ivaData.filter(d => d.year === year);
    const total = yearData.reduce((sum, d) => sum + d.actual, 0);
    return {
      year,
      average: total / 4,
      total,
    };
  });

  // Calculate trend direction
  const ivaTrend = quarterlyAverages.length >= 2
    ? quarterlyAverages[quarterlyAverages.length - 1].average > quarterlyAverages[quarterlyAverages.length - 2].average
      ? 'increasing'
      : quarterlyAverages[quarterlyAverages.length - 1].average < quarterlyAverages[quarterlyAverages.length - 2].average
        ? 'decreasing'
        : 'stable'
    : 'insufficient_data';

  const irpfTrend = irpfData.length >= 2
    ? irpfData[irpfData.length - 1].actual > irpfData[irpfData.length - 2].actual
      ? 'increasing'
      : irpfData[irpfData.length - 1].actual < irpfData[irpfData.length - 2].actual
        ? 'decreasing'
        : 'stable'
    : 'insufficient_data';

  return {
    iva: {
      direction: ivaTrend,
      quarterlyAverages,
    },
    irpf: {
      direction: irpfTrend,
      annualData: irpfData,
    },
  };
}

