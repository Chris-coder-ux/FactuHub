'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CSPNonceContextType {
  nonce: string | null;
}

const CSPNonceContext = createContext<CSPNonceContextType>({ nonce: null });

/**
 * Provider for CSP nonce
 * Reads nonce from meta tag or generates one for client-side use
 */
export function CSPNonceProvider({ children }: { children: React.ReactNode }) {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Try to get nonce from meta tag (set by server)
    const metaTag = document.querySelector('meta[name="csp-nonce"]');
    if (metaTag) {
      setNonce(metaTag.getAttribute('content'));
    } else {
      // Fallback: generate nonce for client-side (less secure but functional)
      // In production, nonce should come from server
      const fallbackNonce = btoa(
        Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => String.fromCharCode(b))
          .join('')
      );
      setNonce(fallbackNonce);
    }
  }, []);

  return (
    <CSPNonceContext.Provider value={{ nonce }}>
      {children}
    </CSPNonceContext.Provider>
  );
}

/**
 * Hook to get CSP nonce
 */
export function useCSPNonce(): string | null {
  const { nonce } = useContext(CSPNonceContext);
  return nonce;
}

