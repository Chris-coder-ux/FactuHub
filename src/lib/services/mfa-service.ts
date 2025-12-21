/**
 * Multi-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) using RFC 6238
 */

import { authenticator, totp } from 'otplib';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Configure TOTP
authenticator.options = {
  step: 30, // 30 seconds
  window: [1, 1], // Accept codes from 1 step before and after
};

/**
 * Generate a secret for TOTP
 */
export function generateMFASecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate TOTP URI for QR code
 */
export function generateTOTPURI(email: string, secret: string, issuer: string = 'FacturaHub'): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    logger.error('TOTP verification error', error);
    return false;
  }
}

/**
 * Generate backup codes (one-time use codes for account recovery)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit codes
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify backup code and remove it from the list
 */
export function verifyBackupCode(code: string, backupCodes: string[]): { valid: boolean; remainingCodes: string[] } {
  const index = backupCodes.indexOf(code);
  if (index === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }

  // Remove used code
  const remainingCodes = backupCodes.filter((_, i) => i !== index);
  return { valid: true, remainingCodes };
}

/**
 * Check if MFA is required for user
 */
export function isMFARequired(mfaEnabled: boolean, mfaSecret?: string): boolean {
  return mfaEnabled && !!mfaSecret;
}

