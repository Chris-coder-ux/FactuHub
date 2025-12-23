/**
 * Secure Link Component with SRI support
 * Wrapper for link tags (stylesheets, fonts, etc.) that adds SRI integrity checks
 */

import React from 'react';

interface SecureLinkProps extends Omit<React.LinkHTMLAttributes<HTMLLinkElement>, 'crossOrigin' | 'integrity'> {
  /**
   * SRI integrity hash(es)
   * Can be a single hash or multiple hashes separated by spaces
   * Format: 'sha384-...' or 'sha256-... sha384-... sha512-...'
   */
  integrity?: string;
  /**
   * Cross-origin attribute for CORS
   * Required for SRI when loading from different origin
   */
  crossOrigin?: 'anonymous' | 'use-credentials';
}

/**
 * Secure Link component with SRI support
 * Use for external stylesheets, fonts, or other resources
 * 
 * @example
 * ```tsx
 * <SecureLink
 *   rel="stylesheet"
 *   href="https://cdn.example.com/style.css"
 *   integrity="sha384-abc123..."
 *   crossOrigin="anonymous"
 * />
 * ```
 */
export function SecureLink({
  integrity,
  crossOrigin = 'anonymous',
  ...props
}: SecureLinkProps) {
  // If integrity is provided, ensure crossOrigin is set
  const finalCrossOrigin = integrity ? crossOrigin : undefined;

  // Use type assertion to include integrity and crossOrigin
  // These are valid HTML attributes but TypeScript types may not include them
  return (
    <link
      {...props}
      {...(integrity ? { integrity } : {})}
      {...(finalCrossOrigin ? { crossOrigin: finalCrossOrigin } : {})}
    />
  );
}

