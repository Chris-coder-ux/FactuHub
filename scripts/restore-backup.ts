#!/usr/bin/env tsx
/**
 * Database Restore Script from Encrypted Backup
 * 
 * Restores an encrypted backup to MongoDB
 * 
 * Usage:
 *   tsx scripts/restore-backup.ts <backup-file.encrypted>
 * 
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string (required)
 *   ENCRYPTION_KEY - Encryption key for backups (required)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { decrypt } from '../src/lib/encryption';
import { logger } from '../src/lib/logger';

const execAsync = promisify(exec);

interface RestoreConfig {
  mongodbUri: string;
  encryptionKey: string;
  backupFile: string;
}

/**
 * Get configuration from environment variables and arguments
 */
function getConfig(): RestoreConfig {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  if (encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const backupFile = process.argv[2];
  if (!backupFile) {
    throw new Error('Backup file path is required as first argument');
  }

  return {
    mongodbUri,
    encryptionKey,
    backupFile,
  };
}

/**
 * Decrypt backup file
 */
async function decryptFile(inputPath: string, outputPath: string): Promise<void> {
  logger.info('Decrypting backup...', { inputPath, outputPath });
  
  try {
    // Read encrypted file
    const encryptedContent = await readFile(inputPath, 'utf8');
    
    // Decrypt content
    const decryptedContent = await decrypt(encryptedContent);
    
    // Convert from base64 to buffer and write
    const buffer = Buffer.from(decryptedContent, 'base64');
    await writeFile(outputPath, buffer);
    
    logger.info('Backup decrypted successfully', { outputPath });
  } catch (error) {
    logger.error('Failed to decrypt backup', error);
    throw error;
  }
}

/**
 * Extract compressed backup
 */
async function extractBackup(compressedFile: string, outputDir: string): Promise<string> {
  logger.info('Extracting backup...', { compressedFile, outputDir });
  
  try {
    await mkdir(outputDir, { recursive: true });
    
    await execAsync(`tar -xzf "${compressedFile}" -C "${outputDir}"`, {
      maxBuffer: 1024 * 1024 * 100,
    });
    
    // Find the dump directory
    const dumpDir = join(outputDir, 'dump');
    
    logger.info('Backup extracted successfully', { dumpDir });
    return dumpDir;
  } catch (error) {
    logger.error('Failed to extract backup', error);
    throw error;
  }
}

/**
 * Restore MongoDB from dump
 */
async function restoreMongoDump(mongodbUri: string, dumpPath: string): Promise<void> {
  logger.info('Restoring MongoDB from dump...', { mongodbUri, dumpPath });
  
  try {
    // Use --drop to drop existing collections before restoring
    await execAsync(`mongorestore --uri="${mongodbUri}" --drop "${dumpPath}"`, {
      maxBuffer: 1024 * 1024 * 100,
    });
    
    logger.info('MongoDB restore completed successfully');
  } catch (error) {
    logger.error('Failed to restore MongoDB', error);
    throw error;
  }
}

/**
 * Main restore function
 */
async function restoreBackup(): Promise<void> {
  const config = getConfig();
  const tempDir = join(process.cwd(), '.restore-temp');
  const compressedFile = join(tempDir, basename(config.backupFile, '.encrypted'));
  const dumpDir = join(tempDir, 'dump');
  
  logger.info('Starting database restore...', {
    backupFile: config.backupFile,
    mongodbUri: config.mongodbUri.replace(/\/\/.*@/, '//***@'), // Hide credentials in logs
  });
  
  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });
    
    // Decrypt backup
    await decryptFile(config.backupFile, compressedFile);
    
    // Extract backup
    const extractedDumpPath = await extractBackup(compressedFile, tempDir);
    
    // Restore to MongoDB
    await restoreMongoDump(config.mongodbUri, extractedDumpPath);
    
    // Cleanup temp files
    await execAsync(`rm -rf "${tempDir}"`);
    
    logger.info('Restore completed successfully');
    
    console.log(`\n✅ Database restored successfully from ${config.backupFile}`);
    console.log(`\n⚠️  IMPORTANT: Verify the restored data before using in production!`);
  } catch (error) {
    logger.error('Restore failed', error);
    console.error('\n❌ Restore failed:', error instanceof Error ? error.message : String(error));
    
    // Cleanup temp files on error
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  restoreBackup().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { restoreBackup, getConfig };

