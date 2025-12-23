/**
 * Secure Script Component with SRI support
 * Wrapper around Next.js Script component that adds SRI integrity checks
 */

'use client';

import Script, { ScriptProps } from 'next/script';

interface SecureScriptProps extends Omit<ScriptProps, 'integrity' | 'crossOrigin'> {
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
 * Secure Script component with SRI support
 * 
 * @example
 * ```tsx
 * <SecureScript
 *   src="https://cdn.example.com/script.js"
 *   integrity="sha384-abc123..."
 *   crossOrigin="anonymous"
 *   strategy="afterInteractive"
 * />
 * ```
 */
export function SecureScript({
  integrity,
  crossOrigin = 'anonymous',
  ...props
}: SecureScriptProps) {
  // If integrity is provided, ensure crossOrigin is set
  const finalCrossOrigin = integrity ? crossOrigin : undefined;

  // Use dangerouslySetInnerHTML to add integrity and crossOrigin attributes
  // Next.js Script doesn't support these directly, so we need to inject them
  if (integrity) {
    return (
      <Script
        {...props}
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const script = document.createElement('script');
              script.src = '${props.src}';
              script.integrity = '${integrity}';
              script.crossOrigin = '${finalCrossOrigin || 'anonymous'}';
              ${props.async ? "script.async = true;" : ''}
              ${props.defer ? "script.defer = true;" : ''}
              document.head.appendChild(script);
            })();
          `,
        }}
      />
    );
  }

  return <Script {...props} />;
}

