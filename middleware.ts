import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import rateLimiter, { getClientIdentifier, RATE_LIMITS } from './src/lib/rate-limit';
import { enhanceResponseWithCSP } from './src/middleware-csp';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Determine rate limit based on path
  let limit: number = RATE_LIMITS.api.limit;
  let windowMs: number = RATE_LIMITS.api.windowMs;

  if (pathname.startsWith('/api/auth')) {
    limit = RATE_LIMITS.auth.limit;
    windowMs = RATE_LIMITS.auth.windowMs;
  } else if (
    pathname.includes('/send') || 
    pathname.includes('/email')
  ) {
    limit = RATE_LIMITS.email.limit;
    windowMs = RATE_LIMITS.email.windowMs;
  } else if (
    request.method === 'POST' || 
    request.method === 'PUT' || 
    request.method === 'DELETE'
  ) {
    limit = RATE_LIMITS.mutation.limit;
    windowMs = RATE_LIMITS.mutation.windowMs;
  }
  
  // Get client identifier
  const identifier = getClientIdentifier(request);
  
  // Check rate limit (async)
  const { allowed, remaining, resetTime } = await rateLimiter.check(
    `${identifier}:${pathname}`,
    limit,
    windowMs
  );
  
  // Add rate limit headers
  let response = allowed 
    ? NextResponse.next()
    : NextResponse.json(
        { 
          error: 'Too many requests', 
          message: 'Please try again later',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
  
  // Enhance response with CSP nonce and strict CSP
  response = enhanceResponseWithCSP(request, response);
  
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  
  if (!allowed) {
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  }
  
  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
