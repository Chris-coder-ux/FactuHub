/**
 * FAQ API
 * Get frequently asked questions
 */

import { NextRequest, NextResponse } from 'next/server';
import FAQ from '@/lib/models/FAQ';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as string | null;
    const search = searchParams.get('search') as string | null;
    
    const query: any = { isPublished: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select('-__v')
      .lean();
    
    // Incrementar views si hay búsqueda
    if (search && faqs.length > 0) {
      await FAQ.updateMany(
        { _id: { $in: faqs.map(f => f._id) } },
        { $inc: { views: 1 } }
      );
    }
    
    return NextResponse.json({ data: faqs });
  } catch (error) {
    logger.error('Failed to fetch FAQs', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}

