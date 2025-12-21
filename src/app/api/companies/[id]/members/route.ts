import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'accountant', 'sales', 'client']),
});

/**
 * GET /api/companies/[id]/members - Get all members of a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companyId = toCompanyObjectId(params.id);
    
    // Verify user has permission to view members (canManageUsers)
    await requireCompanyPermission(
      session.user.id,
      companyId.toString(),
      'canManageUsers'
    );

    const company = await Company.findById(companyId).populate('members.userId', 'name email');
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Format members with user info
    const members = company.members.map((member: any) => ({
      userId: member.userId._id,
      name: member.userId.name,
      email: member.userId.email,
      role: member.role,
      isOwner: company.ownerId.toString() === member.userId._id.toString(),
    }));

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/members/invite - Invite a new member by email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companyId = toCompanyObjectId(params.id);
    
    // Verify user has permission to manage members
    await requireCompanyPermission(
      session.user.id,
      companyId.toString(),
      'canManageUsers'
    );

    const body = await request.json();
    const { email, role } = inviteMemberSchema.parse(body);

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They need to register first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const isAlreadyMember = company.members.some(
      (m: any) => m.userId.toString() === user._id.toString()
    );
    
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: 'User is already a member of this company' },
        { status: 400 }
      );
    }

    // Add user to members
    company.members.push({
      userId: user._id,
      role: role,
    });

    await company.save();

    // Send invitation email using emailService
    try {
      const { emailService } = await import('@/lib/services/email-service');
      const inviteUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;
      
      await emailService.sendEmail({
        to: user.email,
        subject: `Invitación a unirse a ${company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Invitación a Equipo</h2>
              <p>Hola ${user.name},</p>
              <p>Has sido invitado a unirte a <strong>${company.name}</strong> con el rol de <strong>${role}</strong>.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acceder a la Plataforma
                </a>
              </div>
              <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
                Si no esperabas esta invitación, puedes ignorar este email.
              </p>
            </div>
          </div>
        `,
        companyId: companyId.toString(),
        userId: session.user.id,
        type: 'team_invite',
        metadata: {
          companyId: company._id.toString(),
          companyName: company.name,
          userId: user._id.toString(),
          role,
        },
      });
    } catch (emailError) {
      const { logger } = await import('@/lib/logger');
      logger.error('Error sending invitation email', emailError);
      // Don't fail the invitation if email fails
    }

    return NextResponse.json({
      message: 'Member invited successfully',
      member: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: role,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error inviting member:', error);
    
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
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}

