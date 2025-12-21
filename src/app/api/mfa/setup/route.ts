/**
 * MFA Setup Endpoint
 * Generates secret and QR code for TOTP setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateMFASecret, generateTOTPURI } from '@/lib/services/mfa-service';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new secret (temporary, not saved until verified)
    const secret = generateMFASecret();
    const totpURI = generateTOTPURI(user.email, secret);

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(totpURI);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataURL,
      manualEntryKey: secret, // For manual entry
    });
  } catch (error) {
    logger.error('MFA setup error', error);
    return NextResponse.json(
      { error: 'Failed to setup MFA' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { secret, token } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { error: 'Secret and token are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify token before saving
    const { verifyTOTP } = await import('@/lib/services/mfa-service');
    if (!verifyTOTP(token, secret)) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate backup codes
    const { generateBackupCodes } = await import('@/lib/services/mfa-service');
    const backupCodes = generateBackupCodes(10);

    // Encrypt secret and backup codes
    const encryptedSecret = await encrypt(secret);
    const encryptedBackupCodes = await Promise.all(backupCodes.map((code: string) => encrypt(code)));

    // Save MFA configuration
    user.mfaSecret = encryptedSecret;
    user.mfaBackupCodes = encryptedBackupCodes;
    user.mfaEnabled = true;
    user.mfaVerified = true;
    await user.save();

    // Return backup codes (only shown once)
    return NextResponse.json({
      success: true,
      backupCodes, // Plain text - user must save these
      message: 'MFA enabled successfully. Please save your backup codes.',
    });
  } catch (error) {
    logger.error('MFA enable error', error);
    return NextResponse.json(
      { error: 'Failed to enable MFA' },
      { status: 500 }
    );
  }
}

