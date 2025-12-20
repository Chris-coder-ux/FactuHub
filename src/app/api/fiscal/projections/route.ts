import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import { generateIVAProjections, generateIRPFProjection } from '@/lib/fiscal/forecasting';
import FiscalProjection from '@/lib/models/FiscalProjection';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function POST(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to generate fiscal projections
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();
    const { year, type } = await request.json();
    if (!year || !type) {
      return NextResponse.json({ error: 'Year and type required' }, { status: 400 });
    }

    // Note: generateIVAProjections and generateIRPFProjection may need to be updated
    // to accept companyId parameter for proper data isolation
    let projections;
    if (type === 'iva') {
      projections = await generateIVAProjections(session.user.id, year);
      // Assign companyId to generated projections
      if (Array.isArray(projections)) {
        projections = projections.map(p => ({ ...p, companyId }));
      }
    } else if (type === 'irpf') {
      const projection = await generateIRPFProjection(session.user.id, year);
      projections = [{ ...projection, companyId }];
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Save projections with companyId
    if (Array.isArray(projections)) {
      for (const projection of projections) {
        await FiscalProjection.findOneAndUpdate(
          createCompanyFilter(companyId, {
            userId: session.user.id,
            year: projection.year,
            type: projection.type,
            quarter: projection.quarter,
          }),
          {
            ...projection,
            companyId: toCompanyObjectId(companyId),
            userId: session.user.id,
          },
          { upsert: true, new: true }
        );
      }
    }

    return NextResponse.json({ projections });
  } catch (error: any) {
    console.error('Error generating projections:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view fiscal projections
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const type = searchParams.get('type');

    // Filter by companyId for data isolation
    const query = createCompanyFilter(companyId, {
      userId: session.user.id,
      year 
    });
    if (type) query.type = type;

    const projections = await FiscalProjection.find(query).sort({ quarter: 1 });

    return NextResponse.json({ projections });
  } catch (error: any) {
    console.error('Error fetching projections:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}