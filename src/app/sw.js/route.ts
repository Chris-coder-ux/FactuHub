import { NextResponse } from 'next/server';

/**
 * Handle service worker request
 * This prevents 404 errors for sw.js
 */
export async function GET() {
  // Return empty service worker script
  return new NextResponse('', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

