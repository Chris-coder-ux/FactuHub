/**
 * Subresource Integrity (SRI) utilities
 * Generates SRI hashes for external resources to protect against compromised CDNs
 */

import { createHash } from 'crypto';

/**
 * Supported hash algorithms for SRI
 */
export type SRIAlgorithm = 'sha256' | 'sha384' | 'sha512';

/**
 * Generate SRI hash for a resource
 * @param content - The content of the resource (string or Buffer)
 * @param algorithm - Hash algorithm to use (default: 'sha384')
 * @returns SRI hash string (e.g., 'sha384-...')
 */
export function generateSRIHash(
  content: string | Buffer,
  algorithm: SRIAlgorithm = 'sha384'
): string {
  const hash = createHash(algorithm);
  hash.update(content);
  const digest = hash.digest('base64');
  return `${algorithm}-${digest}`;
}

/**
 * Generate SRI hash from a URL (fetches content and generates hash)
 * @param url - URL of the resource
 * @param algorithm - Hash algorithm to use (default: 'sha384')
 * @returns Promise with SRI hash string
 */
export async function generateSRIHashFromURL(
  url: string,
  algorithm: SRIAlgorithm = 'sha384'
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const content = await response.text();
  return generateSRIHash(content, algorithm);
}

/**
 * Generate multiple SRI hashes for the same content (for compatibility)
 * @param content - The content of the resource
 * @returns Object with all hash algorithms
 */
export function generateAllSRIHashes(content: string | Buffer): {
  sha256: string;
  sha384: string;
  sha512: string;
} {
  return {
    sha256: generateSRIHash(content, 'sha256'),
    sha384: generateSRIHash(content, 'sha384'),
    sha512: generateSRIHash(content, 'sha512'),
  };
}

/**
 * Format SRI hash for use in integrity attribute
 * Can accept single hash or multiple hashes
 * @param hashes - Single hash string or array of hash strings
 * @returns Formatted integrity string
 */
export function formatSRIIntegrity(
  hashes: string | string[]
): string {
  if (Array.isArray(hashes)) {
    return hashes.join(' ');
  }
  return hashes;
}

/**
 * Validate SRI hash format
 * @param hash - Hash string to validate
 * @returns True if valid, false otherwise
 */
export function isValidSRIHash(hash: string): boolean {
  const pattern = /^(sha256|sha384|sha512)-[A-Za-z0-9+/=]+$/;
  return pattern.test(hash);
}

