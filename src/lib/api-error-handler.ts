import { NextResponse } from 'next/server';

/**
 * Check if an error is a permission/company context error
 */
export function isPermissionError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('Insufficient permissions') ||
    message.includes('Company context required') ||
    message.includes('No company found') ||
    message.includes('create a company') ||
    message.includes('does not belong to your company') ||
    message.includes('not a member of this company')
  );
}

/**
 * Handle permission errors in API routes
 * Returns a 403 response with the error message
 */
export function handlePermissionError(error: any): NextResponse {
  return NextResponse.json(
    { error: error.message || 'Permission denied' },
    { status: 403 }
  );
}

