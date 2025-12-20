import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import { deleteReceiptImage } from '@/lib/file-upload';
import { z } from 'zod';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';

const updateReceiptSchema = z.object({
  extractedData: z.object({
    merchant: z.string().optional(),
    date: z.string().optional(),
    total: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number().optional(),
      price: z.number().optional(),
      total: z.number().optional(),
    })).optional(),
  }).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to update receipts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );

    await connectDB();

    // Verify receipt belongs to user and company
    const receipt = await Receipt.findOne(createCompanyFilter(companyId, {
      _id: params.id, 
      userId: session.user.id,
    }));
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateReceiptSchema.parse(body);

    // Update extracted data if provided
    if (validatedData.extractedData) {
      receipt.extractedData = {
        ...receipt.extractedData,
        ...validatedData.extractedData,
      };
    }

    await receipt.save();

    return NextResponse.json({
      message: 'Receipt updated successfully',
      receipt: {
        _id: receipt._id,
        extractedData: receipt.extractedData,
        confidenceScore: receipt.confidenceScore,
        status: receipt.status,
      },
    });
  } catch (error: any) {
    console.error('Error updating receipt:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to delete receipts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );

    await connectDB();

    // Verify receipt belongs to user and company
    const receipt = await Receipt.findOne(createCompanyFilter(companyId, {
      _id: params.id, 
      userId: session.user.id,
    }));
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Delete the image file
    await deleteReceiptImage(receipt.imageUrl);

    // Delete the receipt record
    await Receipt.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Receipt deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting receipt:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}