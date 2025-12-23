/**
 * Key Rotation Service
 * Handles automatic rotation of encryption keys for sensitive data
 */

import { randomBytes, createHash } from 'crypto';
import dbConnect from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import User from '@/lib/models/User';
import KeyRotation from '@/lib/models/KeyRotation';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

interface RotationContext {
  oldKey: string;
  newKey: string;
}

/**
 * Generate a new encryption key (64 hex characters = 32 bytes)
 */
export function generateNewEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash an encryption key for storage (never store the actual key)
 */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Get encryption key from environment or context
 */
function getEncryptionKey(context?: RotationContext): string {
  if (context?.newKey) {
    return context.newKey;
  }
  
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return 'default-dev-key-not-for-production-change-in-production';
  }
  
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return key;
}

/**
 * Decrypt with old key, encrypt with new key
 */
async function reEncryptValue(
  encryptedValue: string,
  context: RotationContext
): Promise<string> {
  if (!encryptedValue || !isEncrypted(encryptedValue)) {
    // If not encrypted, encrypt with new key
    return await encryptWithKey(encryptedValue, context.newKey);
  }

  try {
    // Decrypt with old key
    const plaintext = await decryptWithKey(encryptedValue, context.oldKey);
    // Encrypt with new key
    return await encryptWithKey(plaintext, context.newKey);
  } catch (error) {
    // If decryption with old key fails, try with new key (might already be rotated)
    try {
      await decryptWithKey(encryptedValue, context.newKey);
      // Already encrypted with new key, return as is
      return encryptedValue;
    } catch {
      logger.error('Failed to re-encrypt value', { error });
      throw error;
    }
  }
}

/**
 * Encrypt with a specific key (temporary function for rotation)
 */
async function encryptWithKey(plaintext: string, key: string): Promise<string> {
  if (!plaintext) return plaintext;

  const { createCipheriv, randomBytes, scrypt } = await import('crypto');
  const { promisify } = await import('util');
  const scryptAsync = promisify(scrypt);

  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const derivedKey = (await scryptAsync(key, salt, 32)) as Buffer;

  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt with a specific key (temporary function for rotation)
 */
async function decryptWithKey(encryptedData: string, key: string): Promise<string> {
  if (!encryptedData) return encryptedData;

  const { createDecipheriv } = await import('crypto');
  const { promisify } = await import('util');
  const { scrypt } = await import('crypto');
  const scryptAsync = promisify(scrypt);

  const combined = Buffer.from(encryptedData, 'base64');
  const salt = combined.subarray(0, 16);
  const iv = combined.subarray(16, 32);
  const authTag = combined.subarray(32, 48);
  const encrypted = combined.subarray(48);

  const derivedKey = (await scryptAsync(key, salt, 32)) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Get the last key rotation date
 */
export async function getLastRotationDate(): Promise<Date | null> {
  try {
    await dbConnect();
    const lastRotation = await KeyRotation.findOne({ status: 'completed' })
      .sort({ rotationDate: -1 })
      .lean();

    return lastRotation?.rotationDate || null;
  } catch (error) {
    logger.error('Error getting last rotation date', error);
    return null;
  }
}

/**
 * Re-encrypt all sensitive data in Settings collection
 */
async function reEncryptSettings(context: RotationContext): Promise<{ processed: number; total: number }> {
  await dbConnect();

  const allSettings = await Settings.find({}).lean();
  let processed = 0;
  let total = allSettings.length;

  for (const settings of allSettings) {
    try {
      const updates: any = {};

      // Re-encrypt VeriFactu certificate password
      if (settings.verifactuCertificatePassword && isEncrypted(settings.verifactuCertificatePassword)) {
        updates.verifactuCertificatePassword = await reEncryptValue(
          settings.verifactuCertificatePassword,
          context
        );
      }

      // Re-encrypt AEAT credentials
      if (settings.aeatUsername && isEncrypted(settings.aeatUsername)) {
        updates.aeatUsername = await reEncryptValue(settings.aeatUsername, context);
      }
      if (settings.aeatPassword && isEncrypted(settings.aeatPassword)) {
        updates.aeatPassword = await reEncryptValue(settings.aeatPassword, context);
      }

      if (Object.keys(updates).length > 0) {
        await Settings.updateOne(
          { _id: settings._id },
          { $set: updates }
        );
        processed++;
      }
    } catch (error) {
      logger.error('Error re-encrypting settings', {
        settingsId: settings._id,
        error,
      });
      // Continue with next record
    }
  }

  return { processed, total };
}

/**
 * Re-encrypt all sensitive data in User collection
 */
async function reEncryptUsers(context: RotationContext): Promise<{ processed: number; total: number }> {
  await dbConnect();

  const allUsers = await User.find({
    $or: [
      { mfaSecret: { $exists: true, $ne: null } },
      { mfaBackupCodes: { $exists: true, $ne: [] } },
    ],
  }).lean();

  let processed = 0;
  let total = allUsers.length;

  for (const user of allUsers) {
    try {
      const updates: any = {};

      // Re-encrypt MFA secret
      if (user.mfaSecret && isEncrypted(user.mfaSecret)) {
        updates.mfaSecret = await reEncryptValue(user.mfaSecret, context);
      }

      // Re-encrypt MFA backup codes
      if (user.mfaBackupCodes && Array.isArray(user.mfaBackupCodes) && user.mfaBackupCodes.length > 0) {
        const reEncryptedCodes = await Promise.all(
          user.mfaBackupCodes.map((code: string) =>
            isEncrypted(code) ? reEncryptValue(code, context) : encryptWithKey(code, context.newKey)
          )
        );
        updates.mfaBackupCodes = reEncryptedCodes;
      }

      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        processed++;
      }
    } catch (error) {
      logger.error('Error re-encrypting user', {
        userId: user._id,
        error,
      });
      // Continue with next record
    }
  }

  return { processed, total };
}

/**
 * Rotate encryption keys for all sensitive data
 */
export async function rotateEncryptionKeys(
  newKey: string,
  oldKey?: string
): Promise<{ success: boolean; recordsProcessed: number; recordsTotal: number; error?: string }> {
  const rotationDate = new Date();
  const oldKeyToUse = oldKey || process.env.ENCRYPTION_KEY || '';
  const previousKeyHash = hashKey(oldKeyToUse);
  const newKeyHash = hashKey(newKey);

  // Validate new key
  if (newKey.length !== 64) {
    throw new Error('New encryption key must be 64 hex characters (32 bytes)');
  }

  // Create rotation record
  await dbConnect();
  const rotationRecord = await KeyRotation.create({
    rotationDate,
    previousKeyHash,
    newKeyHash,
    status: 'in_progress',
    recordsProcessed: 0,
    recordsTotal: 0,
  });

  const context: RotationContext = {
    oldKey: oldKeyToUse,
    newKey,
  };

  try {
    // Re-encrypt Settings
    const settingsResult = await reEncryptSettings(context);
    
    // Re-encrypt Users
    const usersResult = await reEncryptUsers(context);

    const recordsTotal = settingsResult.total + usersResult.total;
    const recordsProcessed = settingsResult.processed + usersResult.processed;

    // Update rotation record
    await KeyRotation.updateOne(
      { _id: rotationRecord._id },
      {
        status: 'completed',
        recordsProcessed,
        recordsTotal,
      }
    );

    logger.info('Key rotation completed successfully', {
      recordsProcessed,
      recordsTotal,
      rotationDate,
    });

    return {
      success: true,
      recordsProcessed,
      recordsTotal,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Update rotation record with error
    await KeyRotation.updateOne(
      { _id: rotationRecord._id },
      {
        status: 'failed',
        error: errorMessage,
      }
    );

    logger.error('Key rotation failed', { error, rotationDate });

    return {
      success: false,
      recordsProcessed: 0,
      recordsTotal: 0,
      error: errorMessage,
    };
  }
}

/**
 * Check if key rotation is needed (every 90 days)
 */
export async function checkAndRotateIfNeeded(): Promise<{
  rotated: boolean;
  reason?: string;
}> {
  try {
    const lastRotation = await getLastRotationDate();
    const rotationIntervalDays = 90;

    if (!lastRotation) {
      // No previous rotation, check if ENCRYPTION_KEY_ROTATION_ENABLED is set
      if (process.env.ENCRYPTION_KEY_ROTATION_ENABLED !== 'true') {
        return {
          rotated: false,
          reason: 'Key rotation not enabled. Set ENCRYPTION_KEY_ROTATION_ENABLED=true to enable automatic rotation.',
        };
      }

      // First rotation - only if explicitly enabled
      logger.info('No previous key rotation found. Automatic rotation requires manual setup.');
      return {
        rotated: false,
        reason: 'No previous rotation found. First rotation must be done manually.',
      };
    }

    const daysSinceRotation =
      (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRotation >= rotationIntervalDays) {
      // Generate new key
      const newKey = generateNewEncryptionKey();
      const oldKey = process.env.ENCRYPTION_KEY;

      if (!oldKey) {
        return {
          rotated: false,
          reason: 'ENCRYPTION_KEY not found. Cannot rotate without current key.',
        };
      }

      logger.info('Starting automatic key rotation', {
        daysSinceRotation: Math.floor(daysSinceRotation),
      });

      const result = await rotateEncryptionKeys(newKey, oldKey);

      if (result.success) {
        logger.warn(
          '⚠️  Key rotation completed. IMPORTANT: Update ENCRYPTION_KEY environment variable with the new key.',
          {
            newKeyHash: hashKey(newKey),
            recordsProcessed: result.recordsProcessed,
          }
        );

        return {
          rotated: true,
          reason: `Rotation completed. ${result.recordsProcessed} records processed. Update ENCRYPTION_KEY environment variable.`,
        };
      } else {
        return {
          rotated: false,
          reason: `Rotation failed: ${result.error}`,
        };
      }
    }

    return {
      rotated: false,
      reason: `Last rotation was ${Math.floor(daysSinceRotation)} days ago. Rotation needed after ${rotationIntervalDays} days.`,
    };
  } catch (error) {
    logger.error('Error checking key rotation', error);
    return {
      rotated: false,
      reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

