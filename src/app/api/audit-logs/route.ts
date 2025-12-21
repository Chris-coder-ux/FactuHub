import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { AuditService } from '@/lib/services/audit-service';
import { getPaginationParams, createPaginatedResponse } from '@/lib/pagination';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require company context
    const { session, companyId } = await requireCompanyContext();
    
    // Solo usuarios con permisos de administrador pueden ver logs de auditoría
    // Usamos canManageSettings como permiso de administrador
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    
    // Filtros
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') as any;
    const resourceType = searchParams.get('resourceType') as any;
    const resourceId = searchParams.get('resourceId') || undefined;
    const success = searchParams.get('success') === 'true' ? true : 
                   searchParams.get('success') === 'false' ? false : 
                   undefined;
    
    // Fechas
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    const { logs, total } = await AuditService.getLogs(companyId, {
      userId,
      action,
      resourceType,
      resourceId,
      success,
      startDate,
      endDate,
      limit,
      skip,
    });
    
    const response = createPaginatedResponse(logs, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get audit logs error', error);
    
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

