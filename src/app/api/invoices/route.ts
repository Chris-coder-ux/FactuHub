import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { z } from 'zod';
import {
  getPaginationParams,
  getCursorPaginationParams,
  getPaginationMode,
  validateSortParam,
  createPaginatedResponse,
  createCursorPaginatedResponse,
  buildCursorFilter,
  ensureIdInSort,
} from '@/lib/pagination';
import { invoiceSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { InvoiceService } from '@/lib/services/invoice-service';
import { veriFactuQueue } from '@/lib/queues/verifactu-queue';
import rateLimiter, { RATE_LIMITS } from '@/lib/rate-limit';
import { auditMiddleware } from '@/lib/middleware/audit-middleware';
import { MetricsService } from '@/lib/services/metrics-service';
import { realtimeService } from '@/lib/services/realtime-service';
import { AnalyticsMaterializedViewsService } from '@/lib/services/analytics-materialized-views';
import { cacheService, cacheKeys, cacheTags, getCacheTTL } from '@/lib/cache';

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
    const paginationMode = getPaginationMode(searchParams);
    const sortParam = searchParams.get('sort');
    const status = searchParams.get('status');
    const { field, order } = validateSortParam(sortParam, ['invoiceNumber', 'total', 'status', 'dueDate', 'createdAt']);
    
    // Build filter with companyId for data isolation
    const baseFilter = createCompanyFilter(companyId, { deletedAt: null });
    if (status && ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      baseFilter.status = status;
    }
    
    // Filter by invoice type if provided
    const type = searchParams.get('type');
    if (type && ['invoice', 'proforma'].includes(type)) {
      baseFilter.invoiceType = type;
    }
    
    // Cursor-based pagination (more efficient for large datasets)
    if (paginationMode === 'cursor') {
      const cursorParams = getCursorPaginationParams(searchParams);
      const sortObj = ensureIdInSort({ field, order });
      
      // Build filter with cursor
      const filter = cursorParams.cursor
        ? buildCursorFilter(baseFilter, cursorParams.cursor, field, order)
        : baseFilter;
      
      // Fetch one extra item to determine if there's a next page
      const invoices = await Invoice.find(filter)
        .populate('client', 'name email taxId address')
        .populate('items.product', 'name price tax')
        .sort(sortObj)
        .limit(cursorParams.limit + 1) // Fetch one extra to check hasMore
        .lean();
      
      const response = createCursorPaginatedResponse(invoices, cursorParams);
      const duration = Date.now() - startTime;
      MetricsService.trackApiPerformance('/api/invoices', duration, 200, 'GET');
      return NextResponse.json(response);
    }
    
    // Offset-based pagination (backward compatible)
    const { page, limit, skip } = getPaginationParams(searchParams);
    
    // Generate cache key based on filters, pagination, and sorting
    const filtersString = `${status || 'all'}:${type || 'all'}`;
    const cacheKey = `${cacheKeys.invoices(companyId, filtersString)}:${page}:${limit}:${field}:${order}`;
    
    // Try to get from cache (only for first page)
    const cached = page === 1 ? await cacheService.get<{ invoices: unknown[]; total: number }>(cacheKey) : null;
    
    if (cached) {
      const response = createPaginatedResponse(cached.invoices, cached.total, { page, limit, skip });
      const duration = Date.now() - startTime;
      MetricsService.trackApiPerformance('/api/invoices', duration, 200, 'GET');
      return NextResponse.json(response);
    }
    
    const [invoices, total] = await Promise.all([
      Invoice.find(baseFilter)
        .populate('client', 'name email taxId address')
        .populate('items.product', 'name price tax')
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(baseFilter)
    ]);
    
    // Cache first page
    if (page === 1) {
      await cacheService.set(cacheKey, { invoices, total }, {
        ttl: getCacheTTL('invoices'),
        tags: [cacheTags.invoices(companyId)],
      });
    }
    
    const response = createPaginatedResponse(invoices, total, { page, limit, skip });
    
    // Track API performance
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, 200, 'GET');
    
    return NextResponse.json(response);
  } catch (error: any) {
    // Use universal error handler
    const { handleApiError } = await import('@/lib/api-error-handler');
    const errorResponse = handleApiError(error);
    
    // Track error
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, errorResponse.status, 'GET');
    
    return errorResponse;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Apply rate limiting per company
    const companyIdentifier = `company_${companyId}`;
    const { allowed, remaining, resetTime } = await rateLimiter.check(
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
        // Fire and forget - don't await to avoid blocking invoice creation
        veriFactuQueue.add({
          invoiceId: invoice._id.toString(),
          companyId,
        }).catch((error) => {
          logger.error('Failed to add VeriFactu job to queue', {
            error: error instanceof Error ? error.message : String(error),
            invoiceId: invoice._id,
            companyId,
          });
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

    // Invalidate analytics views and cache if invoice status affects analytics (async, don't block)
    if (invoice.status === 'paid') {
      // Invalidate materialized views (if enabled)
      if (process.env.ENABLE_ANALYTICS_MATERIALIZED_VIEWS === 'true') {
        AnalyticsMaterializedViewsService.invalidateViews(companyId, [
          'client_profitability',
          'product_profitability',
          'trends',
        ]).catch(err => logger.warn('Failed to invalidate analytics views', { error: err }));
      }
      
      // Invalidate Redis cache for analytics
      const { cacheService, cacheTags } = await import('@/lib/cache');
      cacheService.invalidateByTags([cacheTags.analytics(companyId)]).catch(err => {
        logger.warn('Failed to invalidate analytics cache', { error: err, companyId });
      });
    }

    // Invalidate invoices cache after creating new invoice
    await cacheService.invalidateByTags([cacheTags.invoices(companyId)]).catch(err => {
      logger.warn('Failed to invalidate invoices cache', { error: err, companyId });
    });

    // Track API performance
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, 201, 'POST');
    
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    // Use universal error handler
    const { handleApiError } = await import('@/lib/api-error-handler');
    const errorResponse = handleApiError(error);
    
    // Track error
    const duration = Date.now() - startTime;
    MetricsService.trackApiPerformance('/api/invoices', duration, errorResponse.status, 'POST');
    
    // Log failed audit event (only if we have session)
    try {
      const { session, companyId } = await requireCompanyContext();
      await auditMiddleware(request, {
        userId: session.user.id,
        companyId,
        action: 'create',
        resourceType: 'invoice',
      }, { success: false, errorMessage: error instanceof Error ? error.message : String(error) });
    } catch {
      // Ignore audit errors (user might not be authenticated)
    }
    
    return errorResponse;
  }
}