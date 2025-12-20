import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import { saveReceiptImage, getReceiptImagePath } from '@/lib/file-upload';
import { processReceiptOCR } from '@/lib/ocr-processor';
import { createCompanyFilter, toCompanyObjectId } from '@/lib/mongodb-helpers';

export async function GET(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to view receipts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Filter by companyId for data isolation
    const query = createCompanyFilter(companyId, { userId: session.user.id });
    if (status) {
      query.status = status;
    }

    const receipts = await Receipt.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Receipt.countDocuments(query);

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching receipts:', error);
    
    // Handle permission errors
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to create receipts
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageInvoices'
    );

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('receipt') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Save image
    const imageUrl = await saveReceiptImage(file, session.user.id);

    // Create receipt record with companyId
    const receipt = new Receipt({
      userId: session.user.id,
      companyId: toCompanyObjectId(companyId), // Assign companyId to receipt
      imageUrl,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'processing'
    });

    await receipt.save();

    // Process OCR asynchronously
    try {
      // getReceiptImagePath now returns a Promise (handles cloud downloads)
      const imagePath = await getReceiptImagePath(imageUrl);
      // Check if Vision API should be used (query parameter or environment setting)
      const useVision = formData.get('useVision') === 'true' ||
                       process.env.USE_VISION_OCR === 'true';
      const ocrResult = await processReceiptOCR(imagePath, useVision);

      // Update receipt with OCR results
      receipt.extractedData = ocrResult.extractedData;
      receipt.confidenceScore = ocrResult.confidence;
      receipt.status = 'completed';

      await receipt.save();
    } catch (error) {
      console.error('OCR processing failed:', error);
      receipt.status = 'failed';
      receipt.errorMessage = 'OCR processing failed';
      await receipt.save();
    }

    return NextResponse.json({
      receipt: {
        _id: receipt._id,
        imageUrl,
        status: receipt.status,
        extractedData: receipt.extractedData,
        confidenceScore: receipt.confidenceScore,
        createdAt: receipt.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error uploading receipt:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}