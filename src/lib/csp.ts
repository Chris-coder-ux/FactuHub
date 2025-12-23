/**
 * Content Security Policy (CSP) utilities
 * Generates nonces and builds strict CSP headers
 */

import { randomBytes } from 'crypto';

/**
 * Generate a random nonce for CSP
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Build a strict CSP header value
 * Uses nonces for inline scripts and styles where possible
 */
export function buildCSPHeader(nonce: string, isProduction: boolean): string {
  const directives: string[] = [];

  // Default source - only self
  directives.push("default-src 'self'");

  // Script sources
  // Next.js requires 'unsafe-eval' for hot reloading in development
  // In production, we can be more strict
  if (isProduction) {
    // Production: Use nonce for inline scripts, allow self and specific CDNs
    directives.push(`script-src 'self' 'nonce-${nonce}' https://*.sentry.io`);
  } else {
    // Development: Allow unsafe-eval for Next.js HMR
    directives.push(`script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://*.sentry.io`);
  }

  // Style sources
  // Use nonce for inline styles, but keep unsafe-inline as fallback for Next.js
  // Next.js injects styles inline during SSR
  directives.push(`style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`);

  // Image sources
  directives.push("img-src 'self' data: https: blob:");

  // Font sources
  directives.push("font-src 'self' data:");

  // Connect sources (API calls, WebSockets, etc.)
  directives.push("connect-src 'self' https://*.sentry.io https://*.cloudinary.com wss://*.sentry.io");

  // Frame sources (for iframes)
  directives.push("frame-src 'self'");

  // Object sources (plugins)
  directives.push("object-src 'none'");

  // Base URI
  directives.push("base-uri 'self'");

  // Form actions
  directives.push("form-action 'self'");

  // Frame ancestors (prevents embedding)
  directives.push("frame-ancestors 'none'");

  // Upgrade insecure requests
  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  // Report URI (optional - for CSP violation reporting)
  // Uncomment if you want to collect CSP violation reports
  // directives.push("report-uri /api/csp-report");

  return directives.join('; ');
}

/**
 * Get CSP nonce from request headers (set by middleware)
 */
export function getCSPNonce(request: Request): string | null {
  return request.headers.get('x-csp-nonce');
}

