import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { certificatePinningStore } from '@/lib/security/certificate-pinning';
import { logger } from '@/lib/logger';

/**
 * GET /api/security/certificate-pinning
 * Get certificate pinning status
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    // Get all configured pins
    const pinsMap = (certificatePinningStore as any).pins as Map<string, {
      fingerprints: string[];
      strict?: boolean;
    }>;
    const pins = Array.from(pinsMap.entries()).map(
      ([hostname, config]) => ({
        hostname,
        fingerprintsCount: config.fingerprints.length,
        strict: config.strict ?? true,
        // Show only last 4 characters of first fingerprint for security
        fingerprintPreview: config.fingerprints[0] 
          ? config.fingerprints[0].slice(-4).toUpperCase()
          : null,
      })
    );

    // Check environment variables
    const envConfig = {
      aeatProduction: !!process.env.AEAT_PRODUCTION_CERT_FINGERPRINT,
      aeatSandbox: !!process.env.AEAT_SANDBOX_CERT_FINGERPRINT,
      bbvaProduction: !!process.env.BBVA_PRODUCTION_CERT_FINGERPRINT,
      bbvaSandbox: !!process.env.BBVA_SANDBOX_CERT_FINGERPRINT,
    };

    const totalConfigured = Object.values(envConfig).filter(Boolean).length;
    const totalPins = pins.length;

    return NextResponse.json({
      enabled: totalPins > 0,
      totalPins,
      totalConfigured,
      pins,
      envConfig,
      // Expected APIs
      expectedApis: [
        { name: 'AEAT Production', hostname: 'www.agenciatributaria.es', configured: envConfig.aeatProduction },
        { name: 'AEAT Sandbox', hostname: 'prewww.agenciatributaria.es', configured: envConfig.aeatSandbox },
        { name: 'BBVA Production', hostname: 'api.bbva.com', configured: envConfig.bbvaProduction },
        { name: 'BBVA Sandbox', hostname: 'api.sandbox.bbva.com', configured: envConfig.bbvaSandbox },
      ],
    });
  } catch (error) {
    logger.error('Error fetching certificate pinning status', { error });
    return NextResponse.json(
      { error: 'Failed to fetch certificate pinning status' },
      { status: 500 }
    );
  }
}

