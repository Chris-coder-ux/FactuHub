import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import { cacheService, cacheTags } from '@/lib/cache';

/**
 * Convierte una factura proforma en una factura real
 * POST /api/invoices/[id]/convert-to-invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );

    await dbConnect();

    const invoice = await Invoice.findOne({
      _id: params.id,
      companyId: toCompanyObjectId(companyId),
      deletedAt: null,
    }).populate('client').populate('items.product');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.invoiceType !== 'proforma') {
      return NextResponse.json(
        { error: 'Only proforma invoices can be converted to real invoices' },
        { status: 400 }
      );
    }

    // Convert proforma to invoice
    invoice.invoiceType = 'invoice';
    invoice.status = invoice.status === 'draft' ? 'draft' : invoice.status;
    await invoice.save();

    // Invalidate invoices cache after conversion
    await cacheService.invalidateByTags([cacheTags.invoices(companyId)]).catch(err => {
      logger.warn('Failed to invalidate invoices cache', { error: err, companyId });
    });

    logger.info('Proforma converted to invoice', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      companyId,
    });

    return NextResponse.json({
      success: true,
      invoice: invoice,
      message: 'Proforma convertida a factura real exitosamente',
    });
  } catch (error: any) {
    logger.error('Convert proforma error', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

