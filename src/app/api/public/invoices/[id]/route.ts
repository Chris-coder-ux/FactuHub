import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { randomBytes } from 'node:crypto';

/**
 * Result Pattern para operaciones que pueden fallar
 */
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string; statusCode: number };

/**
 * Genera un token seguro único para acceso público a facturas
 */
function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * GET /api/public/invoices/[id] - Public access to invoice details
 * Requiere token seguro en query parameter para prevenir acceso no autorizado
 * 
 * @example GET /api/public/invoices/123?token=abc123...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    // Validar que se proporcione el token
    if (!token) {
      throw new ValidationError('Token parameter is required for public access');
    }
    
    // Buscar factura por ID
    const invoice = await Invoice.findById(params.id)
      .populate('client')
      .populate('items.product');
      
    if (!invoice) {
      throw new NotFoundError('Invoice', params.id);
    }

    // Si la factura no tiene token público, generarlo (para facturas antiguas)
    if (!invoice.publicToken) {
      invoice.publicToken = generatePublicToken();
      await invoice.save();
      logger.info('Generated public token for existing invoice', {
        invoiceId: invoice._id,
      });
    }

    // Validar que el token proporcionado coincida con el token de la factura
    if (invoice.publicToken !== token) {
      logger.warn('Invalid public token attempt', {
        invoiceId: invoice._id,
        providedToken: token.substring(0, 8) + '...', // Solo log primeros 8 chars por seguridad
      });
      throw new ForbiddenError('Invalid or expired token');
    }

    // Retornar factura (sin datos sensibles adicionales)
    return NextResponse.json({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      client: invoice.client,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate,
      issuedDate: invoice.issuedDate,
      notes: invoice.notes,
      // No exponer: companyId, verifactu fields, deletedAt, etc.
    });
  } catch (error) {
    // Manejo de errores tipados
    if (error instanceof ValidationError) {
      logger.error('Public invoice validation error', {
        invoiceId: params.id,
        error: error.message,
      });
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: error.statusCode }
      );
    }
    
    if (error instanceof NotFoundError) {
      logger.error('Public invoice not found', {
        invoiceId: params.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }
    
    if (error instanceof ForbiddenError) {
      logger.error('Public invoice access forbidden', {
        invoiceId: params.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 403 }
      );
    }
    
    // Error desconocido
    logger.error('Public get invoice error', {
      invoiceId: params.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
