import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { AuditService } from '@/lib/services/audit-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require company context
    const { session, companyId } = await requireCompanyContext();
    
    // Solo usuarios con permisos de administrador pueden ver estadísticas de auditoría
    // Usamos canManageSettings como permiso de administrador
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    
    // Fechas opcionales
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    const stats = await AuditService.getStats(companyId, startDate, endDate);
    
    return NextResponse.json(stats);
  } catch (error: any) {
    logger.error('Get audit stats error', error);
    
    // Handle permission errors
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

