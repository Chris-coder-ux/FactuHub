import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import { getFiscalCalendar } from '@/lib/fiscal/forecasting';
import FiscalProjection from '@/lib/models/FiscalProjection';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { isPast, isToday, differenceInDays } from 'date-fns';

interface FiscalDeadline {
  id: string;
  quarter?: number;
  type: 'iva' | 'irpf' | 'other';
  title: string;
  description: string;
  dueDate: Date;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
  daysUntil: number;
  projectionId?: string;
}

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

    // Get fiscal calendar deadlines
    const calendarDeadlines = await getFiscalCalendar(year);

    // Get existing projections to check completion status
    const projections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year,
      })
    ).lean();

    const now = new Date();
    const deadlines: FiscalDeadline[] = [];

    // Process IVA quarterly deadlines
    for (const calendarDeadline of calendarDeadlines) {
      const dueDate = calendarDeadline.dueDate;
      const daysUntil = differenceInDays(dueDate, now);
      
      // Check if there's a projection for this quarter
      const projection = projections.find(
        p => p.type === 'iva' && p.quarter === calendarDeadline.quarter
      );

      let status: FiscalDeadline['status'];
      if (projection?.actualAmount !== undefined && projection.actualAmount !== null) {
        status = 'completed';
      } else if (isPast(dueDate) && !isToday(dueDate)) {
        status = 'overdue';
      } else if (daysUntil <= 7 && daysUntil >= 0) {
        status = 'due-soon';
      } else {
        status = 'upcoming';
      }

      deadlines.push({
        id: `iva-q${calendarDeadline.quarter}-${year}`,
        quarter: calendarDeadline.quarter,
        type: 'iva',
        title: `IVA Trimestre ${calendarDeadline.quarter}`,
        description: `Modelo 303 - Declaración trimestral de IVA`,
        dueDate,
        status,
        daysUntil,
        projectionId: projection?._id?.toString(),
      });
    }

    // Add IRPF annual deadline (typically April/June depending on regime)
    const irpfDeadline = new Date(year + 1, 5, 30); // June 30 next year
    const irpfDaysUntil = differenceInDays(irpfDeadline, now);
    const irpfProjection = projections.find(p => p.type === 'irpf' && !p.quarter);

    let irpfStatus: FiscalDeadline['status'];
    if (irpfProjection?.actualAmount !== undefined && irpfProjection.actualAmount !== null) {
      irpfStatus = 'completed';
    } else if (isPast(irpfDeadline) && !isToday(irpfDeadline)) {
      irpfStatus = 'overdue';
    } else if (irpfDaysUntil <= 30 && irpfDaysUntil >= 0) {
      irpfStatus = 'due-soon';
    } else {
      irpfStatus = 'upcoming';
    }

    deadlines.push({
      id: `irpf-${year}`,
      type: 'irpf',
      title: 'IRPF Anual',
      description: 'Declaración anual de IRPF',
      dueDate: irpfDeadline,
      status: irpfStatus,
      daysUntil: irpfDaysUntil,
      projectionId: irpfProjection?._id?.toString(),
    });

    // Sort by due date
    deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return NextResponse.json({ deadlines });
  } catch (error: any) {
    console.error('Error fetching fiscal calendar:', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

