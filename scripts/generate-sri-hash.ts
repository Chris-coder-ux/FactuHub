#!/usr/bin/env tsx

/**
 * Script to generate SRI hashes for external resources
 * 
 * Usage:
 *   tsx scripts/generate-sri-hash.ts <url>
 *   tsx scripts/generate-sri-hash.ts <file-path>
 * 
 * Examples:
 *   tsx scripts/generate-sri-hash.ts https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js
 *   tsx scripts/generate-sri-hash.ts ./public/external-script.js
 */

import { readFileSync } from 'fs';
import { generateSRIHash, generateSRIHashFromURL, generateAllSRIHashes } from '../src/lib/sri';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/generate-sri-hash.ts <url|file-path>');
    process.exit(1);
  }

  const resource = args[0];
  let content: string | Buffer;

  try {
    // Check if it's a URL
    if (resource.startsWith('http://') || resource.startsWith('https://')) {
      console.log(`Fetching resource from: ${resource}`);
      const hash = await generateSRIHashFromURL(resource);
      console.log('\n✅ SRI Hash (sha384):');
      console.log(hash);
      
      // Also generate all hashes for reference
      const response = await fetch(resource);
      const text = await response.text();
      const allHashes = generateAllSRIHashes(text);
      console.log('\n📋 All hashes:');
      console.log(`SHA256: ${allHashes.sha256}`);
      console.log(`SHA384: ${allHashes.sha384}`);
      console.log(`SHA512: ${allHashes.sha512}`);
    } else {
      // Assume it's a file path
      console.log(`Reading file: ${resource}`);
      content = readFileSync(resource);
      const allHashes = generateAllSRIHashes(content);
      
      console.log('\n✅ SRI Hashes:');
      console.log(`SHA256: ${allHashes.sha256}`);
      console.log(`SHA384: ${allHashes.sha384}`);
      console.log(`SHA512: ${allHashes.sha512}`);
      console.log('\n💡 Recommended (sha384):');
      console.log(allHashes.sha384);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

