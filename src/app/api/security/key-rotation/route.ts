import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import {
  getLastRotationDate,
  checkAndRotateIfNeeded,
  rotateEncryptionKeys,
  generateNewEncryptionKey,
} from '@/lib/services/key-rotation-service';
import dbConnect from '@/lib/mongodb';
import KeyRotation from '@/lib/models/KeyRotation';
import { logger } from '@/lib/logger';

/**
 * GET /api/security/key-rotation
 * Get key rotation status and history
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    await dbConnect();

    // Get last rotation date
    const lastRotation = await getLastRotationDate();

    // Get rotation history (last 5)
    const rotationHistory = await KeyRotation.find({})
      .sort({ rotationDate: -1 })
      .limit(5)
      .lean();

    // Calculate days since last rotation
    let daysSinceRotation: number | null = null;
    let needsRotation = false;
    const rotationIntervalDays = 90;

    if (lastRotation) {
      daysSinceRotation = Math.floor(
        (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
      );
      needsRotation = daysSinceRotation >= rotationIntervalDays;
    }

    // Check current status
    const checkResult = await checkAndRotateIfNeeded();

    return NextResponse.json({
      success: true,
      lastRotation: lastRotation ? lastRotation.toISOString() : null,
      daysSinceRotation,
      needsRotation,
      rotationIntervalDays,
      rotationEnabled: process.env.ENCRYPTION_KEY_ROTATION_ENABLED === 'true',
      checkResult,
      history: rotationHistory.map((r) => ({
        rotationDate: r.rotationDate,
        status: r.status,
        recordsProcessed: r.recordsProcessed,
        recordsTotal: r.recordsTotal,
        error: r.error,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('Get key rotation status error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/key-rotation
 * Trigger manual key rotation
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const body = await request.json();
    const { action } = body;

    if (action === 'check') {
      // Just check if rotation is needed
      const result = await checkAndRotateIfNeeded();
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'rotate') {
      // Manual rotation
      const oldKey = process.env.ENCRYPTION_KEY;

      if (!oldKey) {
        return NextResponse.json(
          {
            error: 'ENCRYPTION_KEY not found. Cannot rotate without current key.',
          },
          { status: 400 }
        );
      }

      // Generate new key
      const newKey = generateNewEncryptionKey();

      // Rotate keys
      const result = await rotateEncryptionKeys(newKey, oldKey);

      if (result.success) {
        logger.warn('⚠️  Manual key rotation completed. IMPORTANT: Update ENCRYPTION_KEY environment variable.', {
          newKeyHash: require('crypto').createHash('sha256').update(newKey).digest('hex').substring(0, 16),
          recordsProcessed: result.recordsProcessed,
        });

        return NextResponse.json({
          success: true,
          rotated: true,
          recordsProcessed: result.recordsProcessed,
          recordsTotal: result.recordsTotal,
          warning: 'IMPORTANT: Update ENCRYPTION_KEY environment variable with the new key. Check server logs for key hash.',
          message: `Rotation completed. ${result.recordsProcessed} records processed.`,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            rotated: false,
            error: result.error,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "rotate".' },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error('Key rotation action error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

