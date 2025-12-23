import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { 
  encryptCertificatePassword, 
  decryptCertificatePassword,
  encryptAeatCredentials,
  decryptAeatCredentials,
  isEncrypted,
  encrypt,
  decrypt
} from '@/lib/encryption';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { cacheService, getCacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * GET /api/settings - Retrieve company settings (with caching)
 */
export async function GET() {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Cache key for company settings
    const cacheKey = `company_settings_${companyId}`;
    
    // Try to get from cache first
    try {
      const cachedSettings = await cacheService.get<any>(cacheKey);
      if (cachedSettings) {
        logger.debug('Settings retrieved from cache', { companyId });
        
        // Decrypt sensitive fields before returning (cache stores encrypted data)
        const decryptedSettings = { ...cachedSettings };
        
        // Decrypt VeriFactu certificate password if present
        if (decryptedSettings.verifactuCertificatePassword && isEncrypted(decryptedSettings.verifactuCertificatePassword)) {
          try {
            decryptedSettings.verifactuCertificatePassword = await decryptCertificatePassword(decryptedSettings.verifactuCertificatePassword);
          } catch (error) {
            logger.error('Error decrypting certificate password from cache', { error });
            decryptedSettings.verifactuCertificatePassword = '';
          }
        }
        
        // Decrypt AEAT credentials if present
        if (decryptedSettings.aeatUsername && isEncrypted(decryptedSettings.aeatUsername)) {
          try {
            const credentials = await decryptAeatCredentials(
              decryptedSettings.aeatUsername,
              decryptedSettings.aeatPassword || ''
            );
            decryptedSettings.aeatUsername = credentials.username;
            decryptedSettings.aeatPassword = credentials.password;
          } catch (error) {
            logger.error('Error decrypting AEAT credentials from cache', { error });
            decryptedSettings.aeatUsername = '';
            decryptedSettings.aeatPassword = '';
          }
        } else if (decryptedSettings.aeatPassword && isEncrypted(decryptedSettings.aeatPassword)) {
          // If only password is encrypted (edge case)
          try {
            decryptedSettings.aeatPassword = await decrypt(decryptedSettings.aeatPassword);
          } catch (error) {
            logger.error('Error decrypting AEAT password from cache', { error });
            decryptedSettings.aeatPassword = '';
          }
        }
        
        return NextResponse.json({ data: decryptedSettings });
      }
    } catch (cacheError) {
      // If cache fails, continue to database query
      logger.warn('Cache read failed, falling back to database', { error: cacheError });
    }
    
    // Cache miss or error - fetch from database
    await dbConnect();
    
    // Filter settings by companyId to prevent data leakage between companies
    let settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
    
    // If no settings exist yet, return empty object or defaults
    if (!settings) {
      return NextResponse.json({ data: null });
    }
    
    // Cache the encrypted settings (never cache decrypted data for security)
    const settingsToCache = settings.toObject();
    try {
      await cacheService.set(cacheKey, settingsToCache, { ttl: getCacheTTL('settings') });
      logger.debug('Settings cached', { companyId });
    } catch (cacheError) {
      // If cache write fails, continue without caching
      logger.warn('Cache write failed, continuing without cache', { error: cacheError });
    }
    
    // Decrypt sensitive fields before returning
    const decryptedSettings = { ...settingsToCache };
    
    // Decrypt VeriFactu certificate password if present
    if (decryptedSettings.verifactuCertificatePassword && isEncrypted(decryptedSettings.verifactuCertificatePassword)) {
      try {
        decryptedSettings.verifactuCertificatePassword = await decryptCertificatePassword(decryptedSettings.verifactuCertificatePassword);
      } catch (error) {
        logger.error('Error decrypting certificate password:', error);
        // If decryption fails, return empty to force re-entry
        decryptedSettings.verifactuCertificatePassword = '';
      }
    }
    
    // Decrypt AEAT credentials if present
    if (decryptedSettings.aeatUsername && isEncrypted(decryptedSettings.aeatUsername)) {
      try {
        const credentials = await decryptAeatCredentials(
          decryptedSettings.aeatUsername,
          decryptedSettings.aeatPassword || ''
        );
        decryptedSettings.aeatUsername = credentials.username;
        decryptedSettings.aeatPassword = credentials.password;
      } catch (error) {
        logger.error('Error decrypting AEAT credentials:', error);
        decryptedSettings.aeatUsername = '';
        decryptedSettings.aeatPassword = '';
      }
    } else if (decryptedSettings.aeatPassword && isEncrypted(decryptedSettings.aeatPassword)) {
      // If only password is encrypted (edge case)
      try {
        decryptedSettings.aeatPassword = await decrypt(decryptedSettings.aeatPassword);
      } catch (error) {
        logger.error('Error decrypting AEAT password:', error);
        decryptedSettings.aeatPassword = '';
      }
    }
    
    return NextResponse.json({ data: decryptedSettings });
  } catch (error: any) {
    logger.error('Get settings error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings - Update company settings (Requires canManageSettings permission)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Require company context for multi-company support
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to manage settings
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );
    
    await dbConnect();
    
    const body = await request.json();
    
    // Encrypt sensitive fields before saving
    const encryptedBody = { ...body };
    
    // Encrypt VeriFactu certificate password if provided and not already encrypted
    if (encryptedBody.verifactuCertificatePassword) {
      if (!isEncrypted(encryptedBody.verifactuCertificatePassword)) {
        encryptedBody.verifactuCertificatePassword = await encryptCertificatePassword(encryptedBody.verifactuCertificatePassword);
      }
      // If already encrypted, keep as is (allows updates without re-encrypting)
    }
    
    // Encrypt AEAT credentials if provided (encrypt together)
    if (encryptedBody.aeatUsername && !isEncrypted(encryptedBody.aeatUsername)) {
      const encrypted = await encryptAeatCredentials(
        encryptedBody.aeatUsername,
        encryptedBody.aeatPassword || ''
      );
      encryptedBody.aeatUsername = encrypted.username;
      encryptedBody.aeatPassword = encrypted.password;
    } else if (encryptedBody.aeatPassword && !isEncrypted(encryptedBody.aeatPassword)) {
      // If only password is provided (edge case)
      encryptedBody.aeatPassword = await encrypt(encryptedBody.aeatPassword);
    }
    
    // Filter settings by companyId to prevent data leakage between companies
    let settings = await Settings.findOne({ companyId: toCompanyObjectId(companyId) });
    
    if (settings) {
      Object.assign(settings, encryptedBody);
      await settings.save();
    } else {
      // Create new settings with companyId
      settings = await Settings.create({
        ...encryptedBody,
        companyId: toCompanyObjectId(companyId),
      });
    }
    
    // Invalidate cache after update
    const cacheKey = `company_settings_${companyId}`;
    try {
      await cacheService.delete(cacheKey);
      logger.debug('Settings cache invalidated after update', { companyId });
    } catch (cacheError) {
      // If cache invalidation fails, log but continue
      logger.warn('Cache invalidation failed', { error: cacheError });
    }
    
    // Decrypt sensitive fields before returning (for security, don't return encrypted values)
    const responseSettings = { ...settings.toObject() };
    if (responseSettings.verifactuCertificatePassword && isEncrypted(responseSettings.verifactuCertificatePassword)) {
      try {
        responseSettings.verifactuCertificatePassword = await decryptCertificatePassword(responseSettings.verifactuCertificatePassword);
      } catch {
        responseSettings.verifactuCertificatePassword = '';
      }
    }
    if (responseSettings.aeatUsername && isEncrypted(responseSettings.aeatUsername)) {
      try {
        const credentials = await decryptAeatCredentials(
          responseSettings.aeatUsername,
          responseSettings.aeatPassword || ''
        );
        responseSettings.aeatUsername = credentials.username;
        responseSettings.aeatPassword = credentials.password;
      } catch {
        responseSettings.aeatUsername = '';
        responseSettings.aeatPassword = '';
      }
    } else if (responseSettings.aeatPassword && isEncrypted(responseSettings.aeatPassword)) {
      // If only password is encrypted (edge case)
      try {
        responseSettings.aeatPassword = await decrypt(responseSettings.aeatPassword);
      } catch {
        responseSettings.aeatPassword = '';
      }
    }
    
    return NextResponse.json({
      message: 'Configuración actualizada correctamente',
      data: responseSettings
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Insufficient permissions') || error.message?.includes('Company context required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar la configuración' },
      { status: 500 }
    );
  }
}
