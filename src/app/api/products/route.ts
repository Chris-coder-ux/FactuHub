import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Company from '@/lib/models/Company';
import { requireCompanyContext } from '@/lib/auth';
import { z } from 'zod';
import { getPaginationParams, validateSortParam, createPaginatedResponse } from '@/lib/pagination';
import { productSchema } from '@/lib/validations';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import { cacheService, cacheKeys, cacheTags } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sortParam = searchParams.get('sort');
    const { field, order } = validateSortParam(sortParam, ['name', 'price', 'createdAt']);
    
    // Get company to check if it belongs to a group
    const company = await Company.findById(toCompanyObjectId(companyId)).lean();
    
    // Build filter: include own products + shared products from same group
    const filter: any = {
      deletedAt: null,
      $or: [
        { companyId: toCompanyObjectId(companyId) }, // Own products
      ]
    };
    
    // If company belongs to a group, include shared products from that group
    if (company?.groupId) {
      filter.$or.push({
        isShared: true,
        sharedWithGroupId: company.groupId,
      });
    }
    
    // Generate cache key based on filters
    const cacheKey = `${cacheKeys.products(companyId)}:${page}:${limit}:${field}:${order}:${company?.groupId || 'nogroup'}`;
    
    // Try to get from cache (only for first page to avoid cache bloat)
    const cached = page === 1 ? await cacheService.get<{ products: unknown[]; total: number }>(cacheKey) : null;
    
    if (cached) {
      return NextResponse.json(createPaginatedResponse(cached.products, cached.total, { page, limit, skip }));
    }
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);
    
    // Cache first page for 1 hour
    if (page === 1) {
      await cacheService.set(cacheKey, { products, total }, {
        ttl: 3600,
        tags: [cacheTags.products(companyId)],
      });
    }
    
    const response = createPaginatedResponse(products, total, { page, limit, skip });
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Get products error', error);
    
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

    // Invalidate products cache
    await cacheService.invalidateByTags([cacheTags.products(companyId)]);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    logger.error('Create product error', error);
    
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
