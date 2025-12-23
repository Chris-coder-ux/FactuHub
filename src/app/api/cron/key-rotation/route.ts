import { NextRequest, NextResponse } from 'next/server';
import { checkAndRotateIfNeeded } from '@/lib/services/key-rotation-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/key-rotation
 * Cron job to check and rotate encryption keys if needed (every 90 days)
 * 
 * Authentication: Requires CRON_SECRET header
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if rotation is needed
    const result = await checkAndRotateIfNeeded();

    if (result.rotated) {
      logger.warn('⚠️  Key rotation completed. Manual action required!', {
        reason: result.reason,
      });

      return NextResponse.json({
        success: true,
        rotated: true,
        message: result.reason,
        warning: 'IMPORTANT: Update ENCRYPTION_KEY environment variable with the new key. Check logs for key hash.',
      });
    }

    return NextResponse.json({
      success: true,
      rotated: false,
      message: result.reason,
    });
  } catch (error) {
    logger.error('Key rotation cron job error', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

