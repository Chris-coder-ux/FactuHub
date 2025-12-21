import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { z } from 'zod';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { invoiceSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { InvoiceService } from '@/lib/services/invoice-service';
import { veriFactuQueue } from '@/lib/queues/verifactu-queue';
import rateLimiter, { RATE_LIMITS } from '@/lib/rate-limit';
import { auditMiddleware } from '@/lib/middleware/audit-middleware';
import { MetricsService } from '@/lib/services/metrics-service';
import { realtimeService } from '@/lib/services/realtime-service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view invoices
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const status = searchParams.get('status');
    const { field, order } = validateSortParam(sortParam, ['invoiceNumber', 'total', 'status', 'dueDate', 'createdAt']);
    
    // Build filter with companyId for data isolation
    const filter = createCompanyFilter(companyId, { deletedAt: null });
    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      filter.status = status;
    }
    
    // Filter by invoice type if provided
    const type = searchParams.get('type');
    if (type && ['invoice', 'proforma'].includes(type)) {
      filter.invoiceType = type;
    }
    
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('client', 'name email taxId address')
        .populate('items.product', 'name price tax')
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter)
    ]);
    
    const response = createPaginatedResponse(invoices, total, { page, limit, skip });
    
    // Track API performance
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, 200, 'GET');
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get invoices error', error);
    
    // Track error
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, 500, 'GET');
    
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Apply rate limiting per company
    const companyIdentifier = `company_${companyId}`;
    const { allowed, remaining, resetTime } = rateLimiter.check(
      companyIdentifier,
      RATE_LIMITS.mutation.limit,
      RATE_LIMITS.mutation.windowMs
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded for your company. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.mutation.limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    // Verify user has permission to create invoices
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    const body = await request.json();
    const validatedData = invoiceSchema.parse(body);

    // Create invoice using service (handles validation, counter, etc.)
    const invoice = await InvoiceService.createInvoice(companyId, validatedData);

    // Emit real-time event
    await realtimeService.emitInvoiceCreated(
      companyId,
      invoice._id.toString(),
      invoice.invoiceNumber,
      session.user.id
    );

    // Log audit event
    await auditMiddleware(request, {
      userId: session.user.id,
      companyId,
      action: 'create',
      resourceType: 'invoice',
      resourceId: invoice._id.toString(),
      changes: {
        after: {
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          status: invoice.status,
        },
      },
    }, { success: true });

    // Process VeriFactu asynchronously using queue system
    try {
      await dbConnect();
      const settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
      
      if (settings && InvoiceService.shouldProcessVeriFactu(invoice, settings)) {
        // Add to queue for async processing (with delay and retry logic)
        veriFactuQueue.add({
          invoiceId: invoice._id.toString(),
          companyId,
        });
        
        logger.info('VeriFactu job queued for async processing', {
          invoiceId: invoice._id,
          companyId,
        });
      }
    } catch (verifactuError) {
      logger.error('VeriFactu queue setup failed', { error: verifactuError, invoiceId: invoice._id });
      // Don't fail invoice creation for VeriFactu errors
    }

    // Track API performance
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, 201, 'POST');
    
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    logger.error('Create invoice error', error);
    
    // Track error
    const duration = Date.now() - startTime;
    const statusCode = error.message?.includes('Insufficient permissions') ? 403 :
                      error instanceof z.ZodError ? 400 : 500;
    MetricsService.trackApiPerformance('/api/invoices', duration, statusCode, 'POST');
    
    // Log failed audit event
    try {
      const { session, companyId } = await requireCompanyContext();
      await auditMiddleware(request, {
        userId: session.user.id,
        companyId,
        action: 'create',
        resourceType: 'invoice',
      }, { success: false, errorMessage: error.message });
    } catch {
      // Ignore audit errors
    }
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required') ||
        error.message?.includes('No company found') ||
        error.message?.includes('create a company') ||
        error.message?.includes('does not belong to your company')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: error.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}