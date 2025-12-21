import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/lib/models/Company';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'accountant', 'sales', 'client']),
});

/**
 * PATCH /api/companies/[id]/members/[userId] - Update member role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companyId = toCompanyObjectId(params.id);
    const userId = new mongoose.Types.ObjectId(params.userId);
    
    // Verify user has permission to manage members
    await requireCompanyPermission(
      session.user.id,
      companyId.toString(),
      'canManageUsers'
    );

    const body = await request.json();
    const { role } = updateRoleSchema.parse(body);

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is owner (cannot change owner role)
    if (company.ownerId.toString() === userId.toString()) {
      return NextResponse.json(
        { error: 'Cannot change role of company owner' },
        { status: 400 }
      );
    }

    // Find and update member
    const memberIndex = company.members.findIndex(
      (m: any) => m.userId.toString() === userId.toString()
    );

    if (memberIndex === -1) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    company.members[memberIndex].role = role;
    await company.save();

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: {
        userId: userId.toString(),
        role: role,
      },
    });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', errors: error.issues },
        { status: 400 }
      );
    }

    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/members/[userId] - Remove member from company
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companyId = toCompanyObjectId(params.id);
    const userId = new mongoose.Types.ObjectId(params.userId);
    
    // Verify user has permission to manage members
    await requireCompanyPermission(
      session.user.id,
      companyId.toString(),
      'canManageUsers'
    );

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is owner (cannot remove owner)
    if (company.ownerId.toString() === userId.toString()) {
      return NextResponse.json(
        { error: 'Cannot remove company owner' },
        { status: 400 }
      );
    }

    // Remove member
    company.members = company.members.filter(
      (m: any) => m.userId.toString() !== userId.toString()
    );

    await company.save();

    return NextResponse.json({
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

