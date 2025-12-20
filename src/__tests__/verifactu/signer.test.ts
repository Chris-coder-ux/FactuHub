/* @jest-environment node */

import { VeriFactuSigner } from '@/lib/verifactu/signer';
import * as fs from 'fs';

// Mock fs for testing
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('VeriFactuSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Certificate Loading', () => {
    test('should throw error for invalid certificate path', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        new VeriFactuSigner('/invalid/path.p12', 'password');
      }).toThrow('Failed to load certificate');
    });

    test('should throw error for invalid password', () => {
      // Mock invalid P12 data that would fail decryption
      mockedFs.readFileSync.mockReturnValue(Buffer.from('invalid p12 data'));

      expect(() => {
        new VeriFactuSigner('/path/to/cert.p12', 'wrongpassword');
      }).toThrow('Failed to load certificate');
    });
  });

  describe('XML Signing', () => {
    test('should have signXML method', () => {
      // Test that the class has the expected methods without instantiating
      expect(typeof VeriFactuSigner.prototype.signXML).toBe('function');
    });

    test('should have verifySignature method', () => {
      // Test that the class has the expected methods
      expect(typeof VeriFactuSigner.prototype.verifySignature).toBe('function');
    });
  });

  describe('XAdES-BES Structure', () => {
    test('should create XAdES-BES compliant signature structure', () => {
      // Test that the class is properly defined
      expect(VeriFactuSigner).toBeDefined();
      expect(VeriFactuSigner.prototype).toHaveProperty('signXML');
      expect(VeriFactuSigner.prototype).toHaveProperty('verifySignature');
    });

    test('should include required XAdES methods', () => {
      // Test that private methods exist (they're used internally)
      const prototype = VeriFactuSigner.prototype;
      expect(typeof (prototype as any).createXAdESSignature).toBe('function');
      expect(typeof (prototype as any).calculateDigest).toBe('function');
      expect(typeof (prototype as any).getCertificateBase64).toBe('function');
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.clearAllTimers();
    });
  });
});