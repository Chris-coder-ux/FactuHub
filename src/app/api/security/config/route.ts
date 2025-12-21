/**
 * Security Analysis Configuration API
 * GET: Get security analysis configuration
 * POST: Update security analysis configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const configSchema = z.object({
  securityAnalysisEnabled: z.boolean().optional(),
  securityAnalysisFrequency: z.enum(['15min', '30min', '1hour', '2hours', '6hours', '12hours', '24hours']).optional(),
});

/**
 * GET /api/security/config
 * Returns security analysis configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const settings = await Settings.findOne({ companyId: session.user.companyId }).lean();
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        config: {
          securityAnalysisEnabled: true,
          securityAnalysisFrequency: '1hour',
          securityAnalysisLastRun: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        securityAnalysisEnabled: settings.securityAnalysisEnabled ?? true,
        securityAnalysisFrequency: settings.securityAnalysisFrequency || '1hour',
        securityAnalysisLastRun: settings.securityAnalysisLastRun || null,
      },
    });
  } catch (error) {
    logger.error('Error fetching security config', error);
    return NextResponse.json(
      { error: 'Failed to fetch security configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/config
 * Updates security analysis configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validated = configSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validated.error.issues },
        { status: 400 }
      );
    }

    await dbConnect();

    const settings = await Settings.findOneAndUpdate(
      { companyId: session.user.companyId },
      {
        $set: {
          ...(validated.data.securityAnalysisEnabled !== undefined && {
            securityAnalysisEnabled: validated.data.securityAnalysisEnabled,
          }),
          ...(validated.data.securityAnalysisFrequency && {
            securityAnalysisFrequency: validated.data.securityAnalysisFrequency,
          }),
        },
      },
      { upsert: true, new: true }
    );

    logger.info('Security analysis configuration updated', {
      companyId: session.user.companyId,
      config: validated.data,
    });

    return NextResponse.json({
      success: true,
      config: {
        securityAnalysisEnabled: settings.securityAnalysisEnabled ?? true,
        securityAnalysisFrequency: settings.securityAnalysisFrequency || '1hour',
        securityAnalysisLastRun: settings.securityAnalysisLastRun || null,
      },
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    logger.error('Error updating security config', error);
    return NextResponse.json(
      { error: 'Failed to update security configuration' },
      { status: 500 }
    );
  }
}

