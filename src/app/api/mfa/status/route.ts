/**
 * MFA Status Endpoint
 * Returns MFA status for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const user = await User.findById(session.user.id).select('mfaEnabled mfaVerified');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      mfaEnabled: user.mfaEnabled || false,
      mfaVerified: user.mfaVerified || false,
      hasBackupCodes: (user.mfaBackupCodes?.length || 0) > 0,
    });
  } catch (error) {
    logger.error('MFA status error', error);
    return NextResponse.json(
      { error: 'Failed to get MFA status' },
      { status: 500 }
    );
  }
}

