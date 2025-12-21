/**
 * Custom Login Endpoint with MFA Support
 * Handles two-step authentication when MFA is enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyTOTP, verifyBackupCode, isMFARequired } from '@/lib/services/mfa-service';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(), // Required if MFA is enabled
  isBackupCode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    await dbConnect();

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if MFA is required
    if (isMFARequired(user.mfaEnabled || false, user.mfaSecret)) {
      // MFA is enabled, require token
      if (!validated.mfaToken) {
        return NextResponse.json(
          { 
            error: 'MFA token required',
            requiresMFA: true,
            email: validated.email,
          },
          { status: 200 } // 200 because this is a valid state, not an error
        );
      }

      // Verify MFA token
      let mfaValid = false;

      if (validated.isBackupCode) {
        // Verify backup code
        if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
          return NextResponse.json(
            { error: 'No backup codes available' },
            { status: 400 }
          );
        }

        const decryptedCodes = await Promise.all(
          user.mfaBackupCodes.map((code: string) => decrypt(code))
        );
        const result = verifyBackupCode(validated.mfaToken, decryptedCodes);

        if (result.valid) {
          mfaValid = true;
          // Update backup codes (remove used one)
          const { encrypt } = await import('@/lib/encryption');
          user.mfaBackupCodes = await Promise.all(
            result.remainingCodes.map((code: string) => encrypt(code))
          );
          await user.save();
        }
      } else {
        // Verify TOTP
        const decryptedSecret = await decrypt(user.mfaSecret!);
        mfaValid = verifyTOTP(validated.mfaToken, decryptedSecret);
      }

      if (!mfaValid) {
        return NextResponse.json(
          { error: 'Invalid MFA token' },
          { status: 401 }
        );
      }
    }

    // Authentication successful
    // Return user data (NextAuth will handle session creation)
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      requiresMFA: false,
    });
  } catch (error) {
    logger.error('Login error', error);

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

