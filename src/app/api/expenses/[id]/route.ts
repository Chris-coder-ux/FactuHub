import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import Receipt from '@/lib/models/Receipt';
import { z } from 'zod';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

const updateExpenseSchema = z.object({
  receiptIds: z.array(z.string()).optional(),
  category: z.enum(['travel', 'meals', 'office', 'supplies', 'utilities', 'marketing', 'software', 'professional_services', 'other']).optional(),
  amount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  date: z.string().or(z.date()).optional(),
  description: z.string().min(1).optional(),
  vendor: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
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
      'canManageExpenses'
    );
    
    await connectDB();
    
    const expense = await Expense.findOne(
      createCompanyFilter(companyId, { _id: params.id })
    )
      .populate('receiptIds')
      .lean();
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return NextResponse.json(expense);
  } catch (error: any) {
    logger.error('Get expense error', error);
    
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
      'canManageExpenses'
    );
    
    await connectDB();
    
    const expense = await Expense.findOne(
      createCompanyFilter(companyId, { _id: params.id })
    );
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const validatedData = updateExpenseSchema.parse(body);
    
    // Validate receipts if provided
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
    
    // Update expense fields
    if (validatedData.receiptIds !== undefined) {
      // Remove old associations
      await Receipt.updateMany(
        { expenseId: expense._id },
        { $unset: { expenseId: 1 } }
      );
      
      // Set new associations
      expense.receiptIds = validatedData.receiptIds.map(id => toCompanyObjectId(id));
      await Receipt.updateMany(
        { _id: { $in: validatedData.receiptIds } },
        { expenseId: expense._id }
      );
    }
    
    if (validatedData.category !== undefined) expense.category = validatedData.category;
    if (validatedData.amount !== undefined) expense.amount = validatedData.amount;
    if (validatedData.taxAmount !== undefined) expense.taxAmount = validatedData.taxAmount;
    if (validatedData.date !== undefined) expense.date = new Date(validatedData.date);
    if (validatedData.description !== undefined) expense.description = validatedData.description;
    if (validatedData.vendor !== undefined) expense.vendor = validatedData.vendor;
    if (validatedData.status !== undefined) expense.status = validatedData.status;
    if (validatedData.tags !== undefined) expense.tags = validatedData.tags;
    if (validatedData.notes !== undefined) expense.notes = validatedData.notes;
    
    await expense.save();
    
    return NextResponse.json(expense);
  } catch (error: any) {
    logger.error('Update expense error', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageExpenses'
    );
    
    await connectDB();
    
    const expense = await Expense.findOne(
      createCompanyFilter(companyId, { _id: params.id })
    );
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    // Remove associations from receipts
    await Receipt.updateMany(
      { expenseId: expense._id },
      { $unset: { expenseId: 1 } }
    );
    
    // Delete expense
    await Expense.findByIdAndDelete(params.id);
    
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    logger.error('Delete expense error', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

