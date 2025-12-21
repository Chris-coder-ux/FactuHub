/**
 * GDPR Consent Management Endpoints
 * Implements Article 7 of GDPR - Conditions for consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GDPRService } from '@/lib/services/gdpr-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
};

const getUserAgent = (request: NextRequest): string => {
  return request.headers.get('user-agent') || 'unknown';
};

/**
 * GET /api/gdpr/consent
 * Returns current consent status for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const consents = await GDPRService.getUserConsents(session.user.id);

    return NextResponse.json({
      success: true,
      consents,
    });
  } catch (error) {
    logger.error('GDPR consent retrieval error', error);

    return NextResponse.json(
      { error: 'Failed to retrieve consent status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gdpr/consent
 * Updates user consent for specific purposes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    const consentSchema = z.object({
      consentType: z.enum(['marketing', 'analytics', 'necessary', 'functional']),
      granted: z.boolean(),
      version: z.string().default('1.0'),
    });

    const validated = consentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validated.error.issues },
        { status: 400 }
      );
    }

    await GDPRService.updateConsent({
      userId: session.user.id,
      companyId: session.user.companyId,
      consentType: validated.data.consentType,
      granted: validated.data.granted,
      version: validated.data.version,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Consent ${validated.data.granted ? 'granted' : 'revoked'} successfully`,
    });
  } catch (error) {
    logger.error('GDPR consent update error', error);

    return NextResponse.json(
      { error: 'Failed to update consent' },
      { status: 500 }
    );
  }
}

