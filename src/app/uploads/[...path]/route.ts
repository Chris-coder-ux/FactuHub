import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getReceiptImagePath, isLocalImageUrl, isCloudImageUrl } from '@/lib/file-upload';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageUrl = '/uploads/' + params.path.join('/');

    // If image is in cloud storage, redirect to Cloudinary URL
    // (Cloudinary serves images directly via CDN, more efficient)
    if (isCloudImageUrl(imageUrl)) {
      // For cloud images, redirect to the Cloudinary URL
      // The imageUrl stored in DB is already the Cloudinary URL
      return NextResponse.redirect(imageUrl, 301);
    }

    // For local images, serve from filesystem
    const filepath = await getReceiptImagePath(imageUrl);

    // Security check: ensure path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!filepath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filepath);

    // Get MIME type
    const ext = path.extname(filepath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}