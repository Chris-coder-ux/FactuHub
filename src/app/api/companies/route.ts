import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { getUserCompanies } from '@/lib/company-rbac';
import Company from '@/lib/models/Company';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('España'),
  }),
});

/**
 * GET /api/companies - Get all companies user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companies = await getUserCompanies(session.user.id);

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies - Create a new company
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    // Create company with user as owner
    const company = new Company({
      ...validatedData,
      ownerId: session.user.id,
      members: [{
        userId: session.user.id,
        role: 'owner',
      }],
    });

    await company.save();

    // Update user's default companyId if they don't have one
    const User = (await import('@/lib/models/User')).default;
    const user = await User.findById(session.user.id);
    if (user && !user.companyId) {
      user.companyId = company._id;
      await user.save();
    }

    return NextResponse.json({
      message: 'Company created successfully',
      company: {
        _id: company._id,
        name: company.name,
        role: 'owner',
        isOwner: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

