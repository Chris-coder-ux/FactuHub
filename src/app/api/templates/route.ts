import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { TemplateService } from '@/lib/services/template-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['invoice', 'email', 'pdf']),
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
    subject: z.string().min(1),
    body: z.string().min(1),
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

export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const includeShared = searchParams.get('includeShared') === 'true';
    
    const templates = await TemplateService.getTemplates(
      companyId,
      type,
      includeShared
    );
    
    return NextResponse.json({ data: templates });
  } catch (error: any) {
    logger.error('Get templates error', error);
    
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
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    const body = await request.json();
    const validatedData = templateSchema.parse(body);
    
    // Convert string IDs to ObjectIds if needed
    const templateData: any = {
      ...validatedData,
      companyId,
      createdBy: session.user.id,
    };
    
    if (templateData.invoiceTemplate?.client) {
      const mongoose = await import('mongoose');
      templateData.invoiceTemplate.client = new mongoose.Types.ObjectId(templateData.invoiceTemplate.client);
    }
    if (templateData.invoiceTemplate?.items) {
      const mongoose = await import('mongoose');
      templateData.invoiceTemplate.items = templateData.invoiceTemplate.items.map((item: any) => ({
        ...item,
        product: new mongoose.Types.ObjectId(item.product),
      }));
    }
    
    const template = await TemplateService.createTemplate(templateData);
    
    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    logger.error('Create template error', error);
    
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

