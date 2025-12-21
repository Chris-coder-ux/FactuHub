import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { TemplateService } from '@/lib/services/template-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  invoiceTemplate: z.object({
    client: z.string().optional(),
    items: z.array(z.object({
      product: z.string(),
      quantity: z.number().positive(),
      price: z.number().nonnegative(),
      tax: z.number().nonnegative(),
      description: z.string().optional(),
    })).optional(),
    notes: z.string().optional(),
    dueDateDays: z.number().int().positive().optional(),
    status: z.enum(['draft', 'sent']).optional(),
  }).optional(),
  emailTemplate: z.object({
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    variables: z.array(z.string()).optional(),
  }).optional(),
  pdfTemplate: z.object({
    layout: z.enum(['default', 'minimal', 'detailed']).optional(),
    colors: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
    }).optional(),
    logo: z.string().optional(),
    footer: z.string().optional(),
  }).optional(),
  metadata: z.object({
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export async function GET(
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
    
    const template = await TemplateService.getTemplateById(params.id, companyId);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(template);
  } catch (error: any) {
    logger.error('Get template error', error);
    
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

export async function PATCH(
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
    const validatedData = updateTemplateSchema.parse(body);
    
    // Convert string IDs to ObjectIds if needed
    const updates: any = { ...validatedData };
    if (updates.invoiceTemplate?.client) {
      const mongoose = await import('mongoose');
      updates.invoiceTemplate.client = new mongoose.Types.ObjectId(updates.invoiceTemplate.client);
    }
    if (updates.invoiceTemplate?.items) {
      const mongoose = await import('mongoose');
      updates.invoiceTemplate.items = updates.invoiceTemplate.items.map((item: any) => ({
        ...item,
        product: new mongoose.Types.ObjectId(item.product),
      }));
    }
    
    const template = await TemplateService.updateTemplate(
      params.id,
      companyId,
      updates
    );
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(template);
  } catch (error: any) {
    logger.error('Update template error', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: error.issues 
      }, { status: 400 });
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

export async function DELETE(
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
    
    const deleted = await TemplateService.deleteTemplate(params.id, companyId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Delete template error', error);
    
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

