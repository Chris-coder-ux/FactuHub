import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import FiscalProjection from '@/lib/models/FiscalProjection';
import Invoice from '@/lib/models/Invoice';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}

/**
 * GET /api/fiscal/validate
 * Validate fiscal calculations and projections
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

    const checks: ValidationResult['checks'] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get projections
    const projections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year,
      })
    ).lean();

    // Get invoices for validation
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const invoices = await Invoice.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        createdAt: { $gte: oneYearAgo },
        status: { $in: ['sent', 'paid', 'overdue'] },
      })
    ).lean();

    // Check 1: IVA projections should sum correctly
    const ivaProjections = projections.filter(p => p.type === 'iva' && p.quarter);
    if (ivaProjections.length === 4) {
      const totalIVA = ivaProjections.reduce((sum, p) => sum + (p.projectedAmount || 0), 0);
      const averageQuarterly = totalIVA / 4;
      const maxDeviation = Math.max(...ivaProjections.map(p => Math.abs((p.projectedAmount || 0) - averageQuarterly)));
      const deviationPercent = (maxDeviation / averageQuarterly) * 100;

      if (deviationPercent > 50) {
        errors.push(`Desviación excesiva entre trimestres de IVA: ${deviationPercent.toFixed(1)}%`);
        checks.push({
          name: 'Consistencia Trimestral IVA',
          status: 'fail',
          message: `Desviación del ${deviationPercent.toFixed(1)}% entre trimestres`,
        });
      } else if (deviationPercent > 30) {
        warnings.push(`Desviación significativa entre trimestres de IVA: ${deviationPercent.toFixed(1)}%`);
        checks.push({
          name: 'Consistencia Trimestral IVA',
          status: 'warning',
          message: `Desviación del ${deviationPercent.toFixed(1)}% entre trimestres`,
        });
      } else {
        checks.push({
          name: 'Consistencia Trimestral IVA',
          status: 'pass',
          message: 'Proyecciones trimestrales consistentes',
        });
      }
    } else {
      warnings.push('Faltan proyecciones IVA para algunos trimestres');
      checks.push({
        name: 'Completitud Proyecciones IVA',
        status: 'warning',
        message: `Solo ${ivaProjections.length} de 4 trimestres tienen proyecciones`,
      });
    }

    // Check 2: Validate IVA calculations against actual invoices
    if (invoices.length > 0) {
      const actualIVA = invoices.reduce((sum, inv) => {
        return sum + (inv.items?.reduce((itemSum: number, item: any) => {
          const itemTotal = (item.price || 0) * (item.quantity || 0);
          const taxRate = item.taxRate || 0;
          return itemSum + (itemTotal * taxRate / 100);
        }, 0) || 0);
      }, 0);

      const monthsOfData = Math.max(1, Math.ceil((Date.now() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const averageMonthlyIVA = actualIVA / monthsOfData;
      const projectedAnnualIVA = averageMonthlyIVA * 12;

      const totalProjectedIVA = ivaProjections.reduce((sum, p) => sum + (p.projectedAmount || 0), 0);
      const difference = Math.abs(totalProjectedIVA - projectedAnnualIVA);
      const differencePercent = (difference / projectedAnnualIVA) * 100;

      if (differencePercent > 30) {
        warnings.push(`Diferencia significativa entre proyecciones y datos reales: ${differencePercent.toFixed(1)}%`);
        checks.push({
          name: 'Precisión vs Datos Reales',
          status: 'warning',
          message: `Diferencia del ${differencePercent.toFixed(1)}% con datos históricos`,
        });
      } else {
        checks.push({
          name: 'Precisión vs Datos Reales',
          status: 'pass',
          message: `Diferencia del ${differencePercent.toFixed(1)}% - dentro del rango aceptable`,
        });
      }
    }

    // Check 3: Validate confidence scores
    const lowConfidenceProjections = projections.filter(p => (p.confidence || 0) < 0.5);
    if (lowConfidenceProjections.length > 0) {
      warnings.push(`${lowConfidenceProjections.length} proyecciones con baja confianza (<50%)`);
      checks.push({
        name: 'Nivel de Confianza',
        status: 'warning',
        message: `${lowConfidenceProjections.length} proyecciones con confianza <50%`,
      });
    } else {
      checks.push({
        name: 'Nivel de Confianza',
        status: 'pass',
        message: 'Todas las proyecciones tienen confianza ≥50%',
      });
    }

    // Check 4: Validate IRPF projection
    const irpfProjection = projections.find(p => p.type === 'irpf' && !p.quarter);
    if (irpfProjection) {
      const projectedIRPF = irpfProjection.projectedAmount || 0;
      if (projectedIRPF < 0) {
        errors.push('La proyección de IRPF no puede ser negativa');
        checks.push({
          name: 'Validación IRPF',
          status: 'fail',
          message: 'Proyección IRPF negativa',
        });
      } else if (projectedIRPF === 0) {
        warnings.push('La proyección de IRPF es cero');
        checks.push({
          name: 'Validación IRPF',
          status: 'warning',
          message: 'Proyección IRPF es cero',
        });
      } else {
        checks.push({
          name: 'Validación IRPF',
          status: 'pass',
          message: `Proyección IRPF: ${projectedIRPF.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`,
        });
      }
    } else {
      warnings.push('No hay proyección IRPF para este año');
      checks.push({
        name: 'Completitud IRPF',
        status: 'warning',
        message: 'Falta proyección IRPF',
      });
    }

    // Check 5: Validate basedOnData fields
    const invalidDataProjections = projections.filter(p => 
      !p.basedOnData?.historicalInvoices || 
      p.basedOnData.historicalInvoices === 0
    );
    if (invalidDataProjections.length > 0) {
      warnings.push(`${invalidDataProjections.length} proyecciones sin datos históricos suficientes`);
      checks.push({
        name: 'Datos Históricos',
        status: 'warning',
        message: `${invalidDataProjections.length} proyecciones sin datos históricos`,
      });
    } else {
      checks.push({
        name: 'Datos Históricos',
        status: 'pass',
        message: 'Todas las proyecciones tienen datos históricos',
      });
    }

    const isValid = errors.length === 0;

    return NextResponse.json({
      isValid,
      errors,
      warnings,
      checks,
      summary: {
        totalChecks: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: checks.filter(c => c.status === 'warning').length,
        failed: checks.filter(c => c.status === 'fail').length,
      },
    });
  } catch (error: any) {
    logger.error('Error validating fiscal calculations', error);
    
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

