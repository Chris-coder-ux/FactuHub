import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { requireCompanyContext } from '@/lib/auth';
import { z } from 'zod';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { productSchema } from '@/lib/validations';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const { field, order } = validateSortParam(sortParam, ['name', 'price', 'createdAt']);
    
    // Filter by companyId for data isolation
    const filter = createCompanyFilter(companyId, { deletedAt: null });
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments()
    ]);
    
    const response = createPaginatedResponse(products, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get products error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Company context required')) {
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
    
    const body = await request.json();
    const validatedData = productSchema.parse(body);

    await dbConnect();
    
    const product = new Product({
      ...validatedData,
      companyId: toCompanyObjectId(companyId), // Assign companyId to product
    });
    await product.save();

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Company context required')) {
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
