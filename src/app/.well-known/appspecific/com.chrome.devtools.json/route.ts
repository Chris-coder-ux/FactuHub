import { NextResponse } from 'next/server';

/**
 * Handle Chrome DevTools specific request
 * This prevents 404 errors in the console
 */
export async function GET() {
  return NextResponse.json({}, { status: 200 });
}

