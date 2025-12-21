/**
 * Security Alerts API Endpoints
 * GET: List security alerts
 * POST: Acknowledge or resolve alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SecurityAnalysisService } from '@/lib/services/security-analysis-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * GET /api/security/alerts
 * Returns security alerts with filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const severityParam = searchParams.get('severity');
    const severity = severityParam && ['low', 'medium', 'high', 'critical'].includes(severityParam)
      ? severityParam as 'low' | 'medium' | 'high' | 'critical'
      : undefined;
    const acknowledged = searchParams.get('acknowledged') === 'true' ? true : 
                        searchParams.get('acknowledged') === 'false' ? false : undefined;
    const alertType = searchParams.get('alertType') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const { alerts, total } = await SecurityAnalysisService.getAlerts(
      session.user.companyId,
      {
        severity,
        acknowledged,
        alertType,
        startDate,
        endDate,
        limit,
        skip,
      }
    );

    return NextResponse.json({
      success: true,
      alerts,
      total,
      pagination: {
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching security alerts', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/alerts
 * Acknowledge or resolve an alert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const actionSchema = z.object({
      action: z.enum(['acknowledge', 'resolve']),
      alertId: z.string(),
      resolutionNotes: z.string().optional(),
    });

    const validated = actionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validated.error.issues },
        { status: 400 }
      );
    }

    if (validated.data.action === 'acknowledge') {
      await SecurityAnalysisService.acknowledgeAlert(
        validated.data.alertId,
        session.user.id
      );
      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged successfully',
      });
    } else if (validated.data.action === 'resolve') {
      if (!validated.data.resolutionNotes) {
        return NextResponse.json(
          { error: 'Resolution notes are required' },
          { status: 400 }
        );
      }
      await SecurityAnalysisService.resolveAlert(
        validated.data.alertId,
        session.user.id,
        validated.data.resolutionNotes
      );
      return NextResponse.json({
        success: true,
        message: 'Alert resolved successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error processing security alert action', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

