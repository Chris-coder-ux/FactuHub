import { NextRequest } from 'next/server';
import { AuditService } from '@/lib/services/audit-service';
import { logger } from '@/lib/logger';

export interface AuditContext {
  userId: string;
  companyId: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Middleware para capturar automáticamente acciones de auditoría
 */
export async function auditMiddleware(
  request: NextRequest,
  context: AuditContext,
  options: {
    captureRequest?: boolean;
    captureResponse?: boolean;
    success?: boolean;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Determinar acción y tipo de recurso desde la ruta si no se proporcionan
    const path = request.nextUrl.pathname;
    const method = request.method;

    let action = context.action;
    let resourceType = context.resourceType;

    if (!action) {
      // Inferir acción desde el método HTTP
      if (method === 'POST') action = 'create';
      else if (method === 'PUT' || method === 'PATCH') action = 'update';
      else if (method === 'DELETE') action = 'delete';
      else if (method === 'GET') action = 'view';
      else action = 'view';
    }

    if (!resourceType) {
      // Inferir tipo de recurso desde la ruta
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'api') {
        const inferredType = pathParts[1];
        // Normalizar nombres
        if (inferredType === 'invoices') resourceType = 'invoice';
        else if (inferredType === 'clients') resourceType = 'client';
        else if (inferredType === 'products') resourceType = 'product';
        else if (inferredType === 'expenses') resourceType = 'expense';
        else if (inferredType === 'receipts') resourceType = 'receipt';
        else if (inferredType === 'companies') resourceType = 'company';
        else if (inferredType === 'settings') resourceType = 'settings';
        else if (inferredType.includes('banking')) resourceType = 'banking';
        else if (inferredType.includes('fiscal')) resourceType = 'fiscal';
        else resourceType = 'other';
      } else {
        resourceType = 'other';
      }
    }

    // Extraer resourceId de la ruta si existe
    let resourceId = context.resourceId;
    if (!resourceId && path.includes('/[')) {
      const match = path.match(/\[([^\]]+)\]/);
      if (match) {
        const paramName = match[1];
        const urlParams = new URL(request.url).searchParams;
        resourceId = urlParams.get(paramName) || undefined;
      }
    }

    // Crear log de auditoría de forma asíncrona
    await AuditService.createLogAsync({
      userId: context.userId,
      companyId: context.companyId,
      action: action as any,
      resourceType: resourceType as any,
      resourceId,
      changes: context.changes,
      metadata: {
        ...context.metadata,
        method,
        path,
        ...(options.captureRequest && { requestBody: await request.clone().json().catch(() => null) }),
      },
      ipAddress,
      userAgent,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    });
  } catch (error) {
    // No queremos que errores de auditoría afecten la operación principal
    logger.error('Error in audit middleware', error);
  }
}

/**
 * Helper para crear contexto de auditoría desde una operación
 */
export function createAuditContext(
  userId: string,
  companyId: string,
  action: AuditContext['action'],
  resourceType: AuditContext['resourceType'],
  resourceId?: string,
  changes?: AuditContext['changes'],
  metadata?: AuditContext['metadata']
): AuditContext {
  return {
    userId,
    companyId,
    action,
    resourceType,
    resourceId,
    changes,
    metadata,
  };
}

