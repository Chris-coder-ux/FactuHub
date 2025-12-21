/**
 * MFA Verification Endpoint
 * Verifies TOTP token or backup code during login
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyTOTP, verifyBackupCode } from '@/lib/services/mfa-service';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().length(6, { message: 'Token must be 6 digits' }),
  isBackupCode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifySchema.parse(body);

    await dbConnect();

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
      );
    }

    let isValid = false;

    if (validated.isBackupCode) {
      // Verify backup code
      if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
        return NextResponse.json(
          { error: 'No backup codes available' },
          { status: 400 }
        );
      }

      const decryptedCodes = await Promise.all(user.mfaBackupCodes.map((code: string) => decrypt(code)));
      const result = verifyBackupCode(validated.token, decryptedCodes);

      if (result.valid) {
        isValid = true;
        // Update backup codes (remove used one)
        const { encrypt } = await import('@/lib/encryption');
        user.mfaBackupCodes = await Promise.all(result.remainingCodes.map((code: string) => encrypt(code)));
        await user.save();
      }
    } else {
      // Verify TOTP
      const decryptedSecret = await decrypt(user.mfaSecret);
      isValid = verifyTOTP(validated.token, decryptedSecret);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFA verification successful',
    });
  } catch (error) {
    logger.error('MFA verify error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify MFA' },
      { status: 500 }
    );
  }
}

