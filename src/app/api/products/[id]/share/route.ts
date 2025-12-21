import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Company from '@/lib/models/Company';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/products/[id]/share - Share a product with company group
 * DELETE /api/products/[id]/share - Unshare a product from company group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings' // Only admins/owners can share products
    );
    
    await dbConnect();
    
    // Get product and verify it belongs to the company
    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    if (product.companyId?.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Product does not belong to your company' },
        { status: 403 }
      );
    }
    
    // Get company to check if it belongs to a group
    const company = await Company.findById(toCompanyObjectId(companyId));
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    if (!company.groupId) {
      return NextResponse.json(
        { error: 'Your company is not part of a group. Create or join a group first.' },
        { status: 400 }
      );
    }
    
    // Share product with group
    product.isShared = true;
    product.sharedWithGroupId = company.groupId;
    await product.save();
    
    logger.info('Product shared with group', {
      productId: product._id,
      companyId,
      groupId: company.groupId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Product shared with group successfully',
      product,
    });
  } catch (error: any) {
    logger.error('Share product error', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      'canManageSettings'
    );
    
    await dbConnect();
    
    // Get product and verify it belongs to the company
    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    if (product.companyId?.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Product does not belong to your company' },
        { status: 403 }
      );
    }
    
    // Unshare product
    product.isShared = false;
    product.sharedWithGroupId = null;
    await product.save();
    
    logger.info('Product unshared from group', {
      productId: product._id,
      companyId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Product unshared from group successfully',
      product,
    });
  } catch (error: any) {
    logger.error('Unshare product error', error);
    
    if (error.message?.includes('Insufficient permissions') || 
        error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

