import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import FiscalProjection from '@/lib/models/FiscalProjection';
import Invoice from '@/lib/models/Invoice';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import { generateIVAProjections, generateIRPFProjection } from '@/lib/fiscal/forecasting';

interface WhatIfScenario {
  name: string;
  revenueChange: number; // Percentage change
  taxRateChange: number; // Percentage change
  quarter?: number;
  year: number;
}

interface WhatIfResult {
  scenario: WhatIfScenario;
  projectedIVA: number;
  projectedIRPF: number;
  currentIVA: number;
  currentIRPF: number;
  ivaChange: number;
  irpfChange: number;
}

/**
 * POST /api/fiscal/what-if
 * Calculate what-if scenarios for fiscal projections
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();

    const { scenarios } = await request.json();

    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return NextResponse.json(
        { error: 'Scenarios array is required' },
        { status: 400 }
      );
    }

    // Get current projections
    const currentIVAProjections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year: scenarios[0].year,
        type: 'iva',
      })
    ).lean();

    const currentIRPFProjection = await FiscalProjection.findOne(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year: scenarios[0].year,
        type: 'irpf',
      })
    ).lean();

    // Calculate current totals
    const currentIVATotal = currentIVAProjections.reduce(
      (sum, p) => sum + (p.projectedAmount || 0),
      0
    );
    const currentIRPFTotal = currentIRPFProjection?.projectedAmount || 0;

    // Get historical data for calculations
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const invoices = await Invoice.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        createdAt: { $gte: oneYearAgo },
        status: { $in: ['sent', 'paid', 'overdue'] },
      })
    ).lean();

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const averageMonthlyRevenue = totalRevenue / Math.max(1, Math.ceil((Date.now() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    const results: WhatIfResult[] = [];

    for (const scenario of scenarios) {
      // Calculate new revenue based on change
      const newMonthlyRevenue = averageMonthlyRevenue * (1 + scenario.revenueChange / 100);
      
      // Calculate projected IVA
      let projectedIVA = 0;
      
      if (scenario.quarter) {
        // Calculate for specific quarter
        const quarterRevenue = newMonthlyRevenue * 3; // 3 months per quarter
        const baseIVA = currentIVAProjections.find(p => p.quarter === scenario.quarter)?.projectedAmount || 0;
        const revenueMultiplier = (newMonthlyRevenue * 3) / (averageMonthlyRevenue * 3);
        projectedIVA = baseIVA * revenueMultiplier * (1 + scenario.taxRateChange / 100);
      } else {
        // Calculate for all quarters
        for (let q = 1; q <= 4; q++) {
          const quarterRevenue = newMonthlyRevenue * 3;
          const baseIVA = currentIVAProjections.find(p => p.quarter === q)?.projectedAmount || 0;
          const revenueMultiplier = (newMonthlyRevenue * 3) / (averageMonthlyRevenue * 3);
          projectedIVA += baseIVA * revenueMultiplier * (1 + scenario.taxRateChange / 100);
        }
      }

      // Calculate projected IRPF (annual)
      const annualRevenue = newMonthlyRevenue * 12;
      const revenueMultiplier = annualRevenue / (averageMonthlyRevenue * 12);
      const projectedIRPF = currentIRPFTotal * revenueMultiplier * (1 + scenario.taxRateChange / 100);

      const ivaChange = projectedIVA - currentIVATotal;
      const irpfChange = projectedIRPF - currentIRPFTotal;

      results.push({
        scenario,
        projectedIVA,
        projectedIRPF,
        currentIVA: currentIVATotal,
        currentIRPF: currentIRPFTotal,
        ivaChange,
        irpfChange,
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    logger.error('Error calculating what-if scenarios', error);
    
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

