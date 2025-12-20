/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT for production)
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
    return 'default-dev-key-not-for-production-change-in-production';
  }
  
  // Key must be 32 bytes (64 hex characters) for AES-256
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return key;
}

/**
 * Derive a key from the master encryption key using scrypt
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  const masterKey = getEncryptionKey();
  const key = (await scryptAsync(masterKey, salt, 32)) as Buffer;
  return key;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64 encoded string: salt + iv + encryptedData + authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  try {
    // Generate random salt and IV
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    
    // Derive key from master key using salt
    const key = await deriveKey(salt);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt (16) + iv (16) + authTag (16) + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt data encrypted with encrypt()
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    return encryptedData;
  }

  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, 16);
    const iv = combined.subarray(16, 32);
    const authTag = combined.subarray(32, 48);
    const encrypted = combined.subarray(48);
    
    // Derive key
    const key = await deriveKey(salt);
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be unencrypted data (migration scenario)
    // Log error but don't throw - let caller handle it
    console.warn('Decryption failed, data might be unencrypted:', error instanceof Error ? error.message : String(error));
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a string is encrypted (base64 and has minimum length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  
  try {
    const decoded = Buffer.from(value, 'base64');
    // Encrypted data should be at least 48 bytes (salt + iv + authTag)
    return decoded.length >= 48;
  } catch {
    return false;
  }
}

/**
 * Encrypt VeriFactu certificate password
 */
export async function encryptCertificatePassword(password: string): Promise<string> {
  return encrypt(password);
}

/**
 * Decrypt VeriFactu certificate password
 */
export async function decryptCertificatePassword(encryptedPassword: string): Promise<string> {
  return decrypt(encryptedPassword);
}

/**
 * Encrypt AEAT credentials
 */
export async function encryptAeatCredentials(username: string, password: string): Promise<{ username: string; password: string }> {
  return {
    username: await encrypt(username),
    password: await encrypt(password),
  };
}

/**
 * Decrypt AEAT credentials
 */
export async function decryptAeatCredentials(encryptedUsername: string, encryptedPassword: string): Promise<{ username: string; password: string }> {
  return {
    username: await decrypt(encryptedUsername),
    password: await decrypt(encryptedPassword),
  };
}

