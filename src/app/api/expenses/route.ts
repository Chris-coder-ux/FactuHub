import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import Receipt from '@/lib/models/Receipt';
import { z } from 'zod';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

const expenseSchema = z.object({
  receiptIds: z.array(z.string()).optional(),
  category: z.enum(['travel', 'meals', 'office', 'supplies', 'utilities', 'marketing', 'software', 'professional_services', 'other']),
  amount: z.number().min(0),
  taxAmount: z.number().min(0).default(0),
  date: z.string().or(z.date()),
  description: z.string().min(1),
  vendor: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewExpenses'
    );
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const { field, order } = validateSortParam(sortParam, ['date', 'amount', 'category', 'status', 'createdAt']);
    
    // Build filter with companyId for data isolation
    const filter = createCompanyFilter(companyId, {});
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    
    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('receiptIds')
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter)
    ]);
    
    const response = createPaginatedResponse(expenses, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get expenses error', error);
    
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
      'canManageExpenses'
    );
    
    await connectDB();
    
    const body = await request.json();
    const validatedData = expenseSchema.parse(body);
    
    // Validate receipts belong to the same company
    if (validatedData.receiptIds && validatedData.receiptIds.length > 0) {
      const receipts = await Receipt.find({
        _id: { $in: validatedData.receiptIds },
        companyId: toCompanyObjectId(companyId),
      });
      
      if (receipts.length !== validatedData.receiptIds.length) {
        return NextResponse.json(
          { error: 'One or more receipts do not belong to your company' },
          { status: 403 }
        );
      }
    }
    
    // Create expense
    const expense = new Expense({
      userId: session.user.id,
      companyId: toCompanyObjectId(companyId),
      receiptIds: validatedData.receiptIds?.map(id => toCompanyObjectId(id)) || [],
      category: validatedData.category,
      amount: validatedData.amount,
      taxAmount: validatedData.taxAmount || 0,
      date: new Date(validatedData.date),
      description: validatedData.description,
      vendor: validatedData.vendor,
      status: validatedData.status || 'pending',
      tags: validatedData.tags || [],
      notes: validatedData.notes,
    });
    
    await expense.save();
    
    // Update receipts to link them to this expense
    if (validatedData.receiptIds && validatedData.receiptIds.length > 0) {
      await Receipt.updateMany(
        { _id: { $in: validatedData.receiptIds } },
        { expenseId: expense._id }
      );
    }
    
    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    logger.error('Create expense error', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
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

