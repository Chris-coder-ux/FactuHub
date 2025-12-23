import { NextResponse } from 'next/server';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError 
} from '@/lib/errors';
import { logger } from '@/lib/logger';

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

/**
 * Universal API error handler
 * Handles all types of errors and returns appropriate HTTP responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging
  logger.error('API Error', { 
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Handle typed errors
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
      },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
      },
      { status: 403 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: 400 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
      },
      { status: 404 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle generic Error objects with common messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication required')) {
      return NextResponse.json(
        { error: error.message || 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Permission errors
    if (message.includes('forbidden') || 
        message.includes('insufficient permissions') ||
        message.includes('permission denied') ||
        isPermissionError(error)) {
      return NextResponse.json(
        { error: error.message || 'Permission denied' },
        { status: 403 }
      );
    }
    
    // Not found errors
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
  }

  // Unknown error - return 500
  return NextResponse.json(
    { 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
