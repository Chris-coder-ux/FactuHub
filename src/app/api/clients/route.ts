import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/lib/models/Client';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { z } from 'zod';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { clientSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { sanitizeObject } from '@/lib/sanitization';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view clients
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const { field, order } = validateSortParam(sortParam, ['name', 'email', 'createdAt']);
    
    // Filter by companyId for data isolation
    const filter = createCompanyFilter(companyId, { deletedAt: null });
    
    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments()
    ]);
    
    const response = createPaginatedResponse(clients, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get clients error', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to create clients
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );
    
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);
    const validatedData = clientSchema.parse(sanitizedBody);

    await dbConnect();
    
    // Check for existing client in the same company
    const existingClient = await Client.findOne(createCompanyFilter(companyId, {
      email: validatedData.email,
      deletedAt: null,
    }));
    if (existingClient) {
      return NextResponse.json({ message: 'Client with this email already exists' }, { status: 400 });
    }

    const client = new Client({
      ...validatedData,
      companyId: toCompanyObjectId(companyId), // Assign companyId to client
    });
    await client.save();

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    logger.error('Create client error', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
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
