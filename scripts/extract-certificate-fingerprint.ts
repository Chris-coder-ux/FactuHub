#!/usr/bin/env tsx

/**
 * Script to extract certificate fingerprint from a server
 * 
 * Usage:
 *   tsx scripts/extract-certificate-fingerprint.ts <hostname> [port]
 * 
 * Examples:
 *   tsx scripts/extract-certificate-fingerprint.ts www.agenciatributaria.es
 *   tsx scripts/extract-certificate-fingerprint.ts api.sandbox.bbva.com 443
 */

import * as tls from 'tls';
import * as crypto from 'crypto';

function extractFingerprint(cert: Buffer, algorithm: 'sha256' | 'sha1' = 'sha256'): string {
  const hash = crypto.createHash(algorithm).update(cert).digest('hex');
  return hash.toUpperCase().match(/.{1,2}/g)?.join(':') || hash.toUpperCase();
}

async function getCertificate(hostname: string, port: number = 443): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      port,
      hostname,
      {
        rejectUnauthorized: false, // We're just extracting the cert
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.end();

        if (!cert || !cert.raw) {
          reject(new Error('Could not extract certificate'));
          return;
        }

        resolve(Buffer.from(cert.raw));
      }
    );

    socket.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/extract-certificate-fingerprint.ts <hostname> [port]');
    process.exit(1);
  }

  const hostname = args[0];
  const port = args[1] ? parseInt(args[1], 10) : 443;

  try {
    console.log(`Connecting to ${hostname}:${port}...`);
    const cert = await getCertificate(hostname, port);

    const sha256 = extractFingerprint(cert, 'sha256');
    const sha1 = extractFingerprint(cert, 'sha1');

    console.log('\n✅ Certificate Fingerprints:');
    console.log(`SHA-256: ${sha256}`);
    console.log(`SHA-1:   ${sha1}`);
    console.log('\n💡 Add to .env.local:');
    console.log(`   ${hostname.toUpperCase().replace(/\./g, '_')}_CERT_FINGERPRINT="${sha256.replace(/:/g, '')}"`);
    console.log('\n📝 For multiple certificates (rotation), use comma-separated:');
    console.log(`   ${hostname.toUpperCase().replace(/\./g, '_')}_CERT_FINGERPRINT="${sha256.replace(/:/g, '')},BACKUP_FINGERPRINT"`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

