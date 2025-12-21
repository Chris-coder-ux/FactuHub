/**
 * GDPR Data Portability Endpoint
 * Implements Article 20 of GDPR - Right to data portability
 * Returns user data in a machine-readable format (JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GDPRService } from '@/lib/services/gdpr-service';
import { logger } from '@/lib/logger';

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
 * GET /api/gdpr/export
 * Derecho de portabilidad (Art. 20 GDPR)
 * Exports user data in JSON format for portability
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Record processing activity
    await GDPRService.recordProcessingActivity({
      userId: session.user.id,
      activityType: 'portability',
      status: 'pending',
      ipAddress,
      userAgent,
    });

    // Get user data
    const userData = await GDPRService.getUserData(session.user.id, session.user.companyId);

    // Mark activity as completed
    await GDPRService.updateProcessingActivity(
      session.user.id,
      'portability',
      'completed',
      { dataExported: true, format: 'json' }
    );

    // Return as downloadable JSON file
    const jsonData = JSON.stringify(userData, null, 2);
    const filename = `gdpr-export-${session.user.id}-${Date.now()}.json`;

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('GDPR data export error', error);

    return NextResponse.json(
      { error: 'Failed to export personal data' },
      { status: 500 }
    );
  }
}

