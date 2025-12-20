import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { getUserCompanyRole } from '@/lib/company-rbac';
import User from '@/lib/models/User';

/**
 * POST /api/companies/switch - Switch active company context
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this company
    const role = await getUserCompanyRole(session.user.id, companyId);
    if (!role) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      );
    }

    // Update user's default companyId
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.companyId = companyId;
    await user.save();

    // Return success with companyId - client should update session via update() from next-auth
    return NextResponse.json({
      message: 'Company switched successfully',
      companyId: companyId.toString(),
      role,
    });
  } catch (error) {
    console.error('Error switching company:', error);
    return NextResponse.json(
      { error: 'Failed to switch company' },
      { status: 500 }
    );
  }
}

