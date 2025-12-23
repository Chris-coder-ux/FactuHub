#!/usr/bin/env tsx
/**
 * Database Backup Script with Encryption
 * 
 * Creates an encrypted backup of the MongoDB database
 * 
 * Usage:
 *   tsx scripts/backup-database.ts [output-dir]
 * 
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string (required)
 *   ENCRYPTION_KEY - Encryption key for backups (required)
 *   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { encrypt } from '../src/lib/encryption';
import { logger } from '../src/lib/logger';

const execAsync = promisify(exec);

interface BackupConfig {
  mongodbUri: string;
  encryptionKey: string;
  outputDir: string;
  retentionDays: number;
}

/**
 * Get configuration from environment variables
 */
function getConfig(): BackupConfig {
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

  const outputDir = process.argv[2] || process.env.BACKUP_OUTPUT_DIR || './backups';
  const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

  return {
    mongodbUri,
    encryptionKey,
    outputDir,
    retentionDays,
  };
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Create MongoDB dump
 */
async function createMongoDump(mongodbUri: string, outputPath: string): Promise<string> {
  const dumpPath = join(outputPath, 'dump');
  
  logger.info('Creating MongoDB dump...', { outputPath: dumpPath });
  
  try {
    await execAsync(`mongodump --uri="${mongodbUri}" --out="${outputPath}"`, {
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });
    
    logger.info('MongoDB dump created successfully', { dumpPath });
    return dumpPath;
  } catch (error) {
    logger.error('Failed to create MongoDB dump', error);
    throw error;
  }
}

/**
 * Compress directory to tar.gz
 */
async function compressDirectory(sourceDir: string, outputFile: string): Promise<void> {
  logger.info('Compressing backup...', { sourceDir, outputFile });
  
  try {
    // Use tar with gzip compression
    await execAsync(`tar -czf "${outputFile}" -C "${dirname(sourceDir)}" "${sourceDir.split('/').pop()}"`, {
      maxBuffer: 1024 * 1024 * 100,
    });
    
    logger.info('Backup compressed successfully', { outputFile });
  } catch (error) {
    logger.error('Failed to compress backup', error);
    throw error;
  }
}

/**
 * Encrypt file using encryption service
 */
async function encryptFile(inputPath: string, outputPath: string): Promise<void> {
  logger.info('Encrypting backup...', { inputPath, outputPath });
  
  try {
    // Read file as buffer
    const fileBuffer = await readFile(inputPath);
    const fileContent = fileBuffer.toString('base64');
    
    // Encrypt content
    const encryptedContent = await encrypt(fileContent);
    
    // Write encrypted file
    await writeFile(outputPath, encryptedContent, 'utf8');
    
    logger.info('Backup encrypted successfully', { outputPath });
  } catch (error) {
    logger.error('Failed to encrypt backup', error);
    throw error;
  }
}

/**
 * Clean up old backups
 */
async function cleanupOldBackups(backupDir: string, retentionDays: number): Promise<void> {
  logger.info('Cleaning up old backups...', { retentionDays });
  
  try {
    const files = await readdir(backupDir);
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.encrypted')) continue;
      
      const filePath = join(backupDir, file);
      const stats = await stat(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > retentionMs) {
        await unlink(filePath);
        deletedCount++;
        logger.info('Deleted old backup', { file });
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    logger.error('Failed to cleanup old backups', error);
    // Don't throw - cleanup failure shouldn't fail the backup
  }
}

/**
 * Main backup function
 */
async function createBackup(): Promise<void> {
  const config = getConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}`;
  const backupPath = join(config.outputDir, backupName);
  
  logger.info('Starting database backup...', {
    outputDir: config.outputDir,
    retentionDays: config.retentionDays,
  });
  
  try {
    // Ensure backup directory exists
    await ensureBackupDir(config.outputDir);
    
    // Create MongoDB dump
    const dumpPath = await createMongoDump(config.mongodbUri, backupPath);
    
    // Compress dump
    const compressedFile = `${backupPath}.tar.gz`;
    await compressDirectory(dumpPath, compressedFile);
    
    // Encrypt compressed file
    const encryptedFile = `${compressedFile}.encrypted`;
    await encryptFile(compressedFile, encryptedFile);
    
    // Clean up unencrypted files
    await execAsync(`rm -rf "${dumpPath}" "${compressedFile}"`);
    
    // Cleanup old backups
    await cleanupOldBackups(config.outputDir, config.retentionDays);
    
    const fileStats = await stat(encryptedFile);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    
    logger.info('Backup completed successfully', {
      backupFile: encryptedFile,
      sizeMB: fileSizeMB,
    });
    
    console.log(`\n✅ Backup created successfully!`);
    console.log(`📁 File: ${encryptedFile}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`\n⚠️  IMPORTANT: Store this backup securely and keep ENCRYPTION_KEY safe!`);
  } catch (error) {
    logger.error('Backup failed', error);
    console.error('\n❌ Backup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createBackup().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { createBackup, getConfig };

