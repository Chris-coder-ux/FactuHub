/**
 * Utility to sanitize strings and objects against XSS and other injections.
 * Uses DOMPurify for robust HTML sanitization.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize a string using DOMPurify
 * Removes potentially dangerous HTML/scripts while preserving safe content
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Use DOMPurify for robust sanitization
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [], // Remove all attributes
    KEEP_CONTENT: true, // Keep text content
  }).trim();
}

/**
 * Sanitize HTML content (allows safe HTML tags)
 * Use with caution - only for trusted content that needs HTML formatting
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') return html;
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value);
  }
  
  return value;
}

function sanitizeArray(arr: unknown[]): unknown[] {
  return arr.map(sanitizeValue);
}

function sanitizeRecord(source: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      sanitized[key] = sanitizeValue(source[key]);
    }
  }
  return sanitized;
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return sanitizeArray(obj) as unknown as T;
  }
  
  return sanitizeRecord(obj as Record<string, unknown>) as unknown as T;
}
