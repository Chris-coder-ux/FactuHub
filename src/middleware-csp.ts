/**
 * Middleware helper to add CSP nonce to response
 * This is used in addition to next.config.cjs headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateNonce, buildCSPHeader } from './lib/csp';

/**
 * Enhance response with CSP nonce and strict CSP header
 * This should be called from middleware.ts after rate limiting
 */
export function enhanceResponseWithCSP(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = generateNonce();

  // Add nonce to response headers for use in pages/components
  response.headers.set('x-csp-nonce', nonce);

  // Build strict CSP with nonce
  const strictCSP = buildCSPHeader(nonce, isProduction);

  // Override CSP header with strict version (includes nonce)
  response.headers.set('Content-Security-Policy', strictCSP);

  return response;
}

