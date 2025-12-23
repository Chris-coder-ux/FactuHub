/**
 * Certificate Pinning utilities
 * Protects against Man-in-the-Middle (MITM) attacks by verifying server certificates
 */

import * as crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Certificate fingerprint configuration
 */
export interface CertificatePinConfig {
  /**
   * Hostname or domain to pin
   */
  hostname: string;
  /**
   * Expected certificate fingerprints (SHA-256)
   * Multiple fingerprints allow for certificate rotation
   */
  fingerprints: string[];
  /**
   * Whether to enforce pinning (false allows fallback)
   */
  strict?: boolean;
}

/**
 * Certificate pinning store
 * Maps hostnames to their expected certificate fingerprints
 */
class CertificatePinningStore {
  private pins: Map<string, CertificatePinConfig> = new Map();

  /**
   * Register certificate pin for a hostname
   */
  registerPin(config: CertificatePinConfig): void {
    this.pins.set(config.hostname, config);
    logger.info(`Certificate pin registered for ${config.hostname}`, {
      fingerprints: config.fingerprints.length,
      strict: config.strict ?? true,
    });
  }

  /**
   * Get pin configuration for a hostname
   */
  getPin(hostname: string): CertificatePinConfig | undefined {
    return this.pins.get(hostname);
  }

  /**
   * Check if hostname has pinning configured
   */
  hasPin(hostname: string): boolean {
    return this.pins.has(hostname);
  }

  /**
   * Verify certificate fingerprint against expected pins
   */
  verifyFingerprint(hostname: string, certificate: Buffer): boolean {
    const pinConfig = this.getPin(hostname);
    if (!pinConfig) {
      // No pinning configured - allow (for backward compatibility)
      return true;
    }

    // Calculate SHA-256 fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(certificate)
      .digest('hex')
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(':') || '';

    // Check if fingerprint matches any expected fingerprint
    const matches = pinConfig.fingerprints.some(
      (expected) => expected.toUpperCase().replace(/:/g, '') === fingerprint.replace(/:/g, '')
    );

    if (!matches) {
      logger.error(`Certificate pinning failed for ${hostname}`, {
        expected: pinConfig.fingerprints,
        received: fingerprint,
        strict: pinConfig.strict ?? true,
      });

      if (pinConfig.strict !== false) {
        return false;
      }
    } else {
      logger.debug(`Certificate pinning verified for ${hostname}`, {
        fingerprint,
      });
    }

    return true;
  }

  /**
   * Extract certificate fingerprint from certificate buffer
   */
  static extractFingerprint(certificate: Buffer, algorithm: 'sha256' | 'sha1' = 'sha256'): string {
    const hash = crypto.createHash(algorithm).update(certificate).digest('hex');
    return hash.toUpperCase().match(/.{1,2}/g)?.join(':') || hash.toUpperCase();
  }
}

// Global certificate pinning store
export const certificatePinningStore = new CertificatePinningStore();

/**
 * Initialize certificate pins for known APIs
 * This should be called at application startup
 */
export function initializeCertificatePins(): void {
  // AEAT Production
  if (process.env.AEAT_PRODUCTION_CERT_FINGERPRINT) {
    certificatePinningStore.registerPin({
      hostname: 'www.agenciatributaria.es',
      fingerprints: process.env.AEAT_PRODUCTION_CERT_FINGERPRINT.split(',').map((f) => f.trim()),
      strict: true,
    });
  }

  // AEAT Sandbox
  if (process.env.AEAT_SANDBOX_CERT_FINGERPRINT) {
    certificatePinningStore.registerPin({
      hostname: 'prewww.agenciatributaria.es',
      fingerprints: process.env.AEAT_SANDBOX_CERT_FINGERPRINT.split(',').map((f) => f.trim()),
      strict: true,
    });
  }

  // BBVA Production
  if (process.env.BBVA_PRODUCTION_CERT_FINGERPRINT) {
    certificatePinningStore.registerPin({
      hostname: 'api.bbva.com',
      fingerprints: process.env.BBVA_PRODUCTION_CERT_FINGERPRINT.split(',').map((f) => f.trim()),
      strict: true,
    });
  }

  // BBVA Sandbox
  if (process.env.BBVA_SANDBOX_CERT_FINGERPRINT) {
    certificatePinningStore.registerPin({
      hostname: 'api.sandbox.bbva.com',
      fingerprints: process.env.BBVA_SANDBOX_CERT_FINGERPRINT.split(',').map((f) => f.trim()),
      strict: true,
    });
  }

  logger.info('Certificate pinning initialized', {
    pinsCount: certificatePinningStore['pins'].size,
  });
}

/**
 * Create HTTPS agent with certificate pinning
 */
export function createPinnedHttpsAgent(
  hostname: string,
  baseAgent?: any
): any {
  const https = require('https');
  const tls = require('tls');

  return new https.Agent({
    ...baseAgent,
    checkServerIdentity: (servername: string, cert: any) => {
      // First, perform standard hostname verification
      const defaultCheck = tls.checkServerIdentity(servername, cert);
      if (defaultCheck) {
        return defaultCheck;
      }

      // Then, verify certificate pinning
      if (certificatePinningStore.hasPin(hostname)) {
        const certBuffer = Buffer.from(cert.raw || cert.der || '');
        if (certBuffer.length === 0) {
          logger.warn(`Cannot extract certificate for pinning check: ${hostname}`);
          return new Error('Certificate pinning: Unable to extract certificate');
        }

        const isValid = certificatePinningStore.verifyFingerprint(hostname, certBuffer);
        if (!isValid) {
          return new Error(
            `Certificate pinning failed for ${hostname}. Certificate fingerprint does not match expected value(s).`
          );
        }
      }

      return undefined; // No error
    },
  });
}


