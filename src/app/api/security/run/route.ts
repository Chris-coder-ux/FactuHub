/**
 * Manual Security Analysis Execution
 * POST: Manually trigger security analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SecurityAnalysisService } from '@/lib/services/security-analysis-service';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';

/**
 * POST /api/security/run
 * Manually triggers security analysis
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    // Check if security analysis is enabled
    const settings = await Settings.findOne({ companyId: session.user.companyId }).lean();
    if (settings && settings.securityAnalysisEnabled === false) {
      return NextResponse.json(
        { error: 'Security analysis is disabled' },
        { status: 400 }
      );
    }

    logger.info('Manual security analysis triggered', {
      userId: session.user.id,
      companyId: session.user.companyId,
    });

    // Execute analysis
    const analysisResult = await SecurityAnalysisService.analyzeSecurityLogs(
      session.user.companyId
    );

    // Update last run timestamp
    await Settings.findOneAndUpdate(
      { companyId: session.user.companyId },
      {
        $set: {
          securityAnalysisLastRun: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      result: analysisResult,
      message: 'Security analysis completed successfully',
    });
  } catch (error) {
    logger.error('Error running manual security analysis', error);
    return NextResponse.json(
      { error: 'Failed to run security analysis' },
      { status: 500 }
    );
  }
}

