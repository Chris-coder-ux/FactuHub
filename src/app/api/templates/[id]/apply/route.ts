import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { TemplateService } from '@/lib/services/template-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const applyTemplateSchema = z.object({
  clientId: z.string().optional(),
  dueDateDays: z.number().int().positive().optional(),
});

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
    
    const body = await request.json();
    const validatedData = applyTemplateSchema.parse(body);
    
    const invoiceData = await TemplateService.applyInvoiceTemplate({
      templateId: params.id,
      companyId,
      clientId: validatedData.clientId,
      dueDateDays: validatedData.dueDateDays,
    });
    
    return NextResponse.json(invoiceData);
  } catch (error: any) {
    logger.error('Apply template error', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: error.issues 
      }, { status: 400 });
    }
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
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

