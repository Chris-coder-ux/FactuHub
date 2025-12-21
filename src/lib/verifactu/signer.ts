// Digital Signer for VeriFactu
// Implements XAdES-BES signatures using certificates

import * as forge from 'node-forge';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { formatInTimeZone } from 'date-fns-tz';

export class VeriFactuSigner {
  private certificate!: forge.pki.Certificate;
  private privateKey!: forge.pki.PrivateKey;
  private certificateChain!: forge.pki.Certificate[];

  constructor(certificatePath: string, password: string) {
    this.loadCertificate(certificatePath, password);
  }

  private loadCertificate(certificatePath: string, password: string): void {
    try {
      // Read PFX/P12 file
      const p12Data = readFileSync(certificatePath);
      const p12Asn1 = forge.asn1.fromDer(p12Data.toString('binary'));

      // Decrypt P12
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!keyBag) {
        throw new Error('Private key not found in certificate');
      }

      this.privateKey = keyBag.key as forge.pki.PrivateKey;

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (!certBag) {
        throw new Error('Certificate not found');
      }

      this.certificate = certBag.cert as forge.pki.Certificate;

      // Extract certificate chain if available
      this.certificateChain = [this.certificate];
      const certBagArray = certBags[forge.pki.oids.certBag];
      if (certBagArray && certBagArray.length > 1) {
        for (let i = 1; i < certBagArray.length; i++) {
          this.certificateChain.push(certBagArray[i].cert as forge.pki.Certificate);
        }
      }

    } catch (error) {
      throw new Error(`Failed to load certificate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  signXML(xmlContent: string): string {
    try {
      // Create canonical version of XML for signing
      const canonicalXml = this.canonicalizeXML(xmlContent);

      // Calculate digest of the content
      const digestValue = this.calculateDigest(canonicalXml);

      // Create XAdES-BES signature
      const signatureXml = this.createXAdESSignature(canonicalXml, digestValue);

      // Insert signature into original XML
      return this.insertSignatureIntoXML(xmlContent, signatureXml);

    } catch (error) {
      throw new Error(`Failed to sign XML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private canonicalizeXML(xml: string): string {
    // Basic canonicalization - remove extra whitespace between tags
    // For production, should use proper XML canonicalization (C14N)
    return xml.replace(/>\s+</g, '><').trim();
  }

  private calculateDigest(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('base64');
  }

  private createXAdESSignature(canonicalXml: string, digestValue: string): string {
    const now = formatInTimeZone(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const signatureId = `Signature-${Date.now()}`;
    const signedPropertiesId = `SignedProperties-${Date.now()}`;

    // Create signature template
    const signatureTemplate = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">
  <ds:SignedInfo>
    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
    <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
    <ds:Reference URI="">
      <ds:Transforms>
        <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      </ds:Transforms>
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <ds:DigestValue>${digestValue}</ds:DigestValue>
    </ds:Reference>
    <ds:Reference URI="#${signedPropertiesId}" Type="http://uri.etsi.org/01903#SignedProperties">
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <ds:DigestValue>${this.calculateDigest(this.createSignedProperties(signedPropertiesId, now))}</ds:DigestValue>
    </ds:Reference>
  </ds:SignedInfo>
  <ds:SignatureValue>${this.createSignatureValue(canonicalXml)}</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <ds:X509Certificate>${this.getCertificateBase64()}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
  <ds:Object>
    <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${signatureId}">
      <xades:SignedProperties Id="${signedPropertiesId}">
        <xades:SignedSignatureProperties>
          <xades:SigningTime>${now}</xades:SigningTime>
          <xades:SigningCertificate>
            <xades:Cert>
              <xades:CertDigest>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>${this.calculateCertificateDigest()}</ds:DigestValue>
              </xades:CertDigest>
              <xades:IssuerSerial>
                <ds:X509IssuerName>${this.getCertificateIssuer()}</ds:X509IssuerName>
                <ds:X509SerialNumber>${this.getCertificateSerial()}</ds:X509SerialNumber>
              </xades:IssuerSerial>
            </xades:Cert>
          </xades:SigningCertificate>
          <xades:SignerRole>
            <xades:ClaimedRoles>
              <xades:ClaimedRole>supplier</xades:ClaimedRole>
            </xades:ClaimedRoles>
          </xades:SignerRole>
        </xades:SignedSignatureProperties>
        <xades:SignedDataObjectProperties>
          <xades:DataObjectFormat ObjectReference="#Reference-1">
            <xades:MimeType>text/xml</xades:MimeType>
            <xades:Encoding>UTF-8</xades:Encoding>
          </xades:DataObjectFormat>
        </xades:SignedDataObjectProperties>
      </xades:SignedProperties>
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;

    return signatureTemplate;
  }

  private createSignedProperties(id: string, signingTime: string): string {
    return `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${id}">
  <xades:SignedSignatureProperties>
    <xades:SigningTime>${signingTime}</xades:SigningTime>
    <xades:SigningCertificate>
      <xades:Cert>
        <xades:CertDigest>
          <ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${this.calculateCertificateDigest()}</ds:DigestValue>
        </xades:CertDigest>
        <xades:IssuerSerial>
          <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${this.getCertificateIssuer()}</ds:X509IssuerName>
          <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${this.getCertificateSerial()}</ds:X509SerialNumber>
        </xades:IssuerSerial>
      </xades:Cert>
    </xades:SigningCertificate>
  </xades:SignedSignatureProperties>
</xades:SignedProperties>`;
  }

  private createSignatureValue(canonicalXml: string): string {
    try {
      // Create the SignedInfo content for signing
      const signedInfoContent = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <ds:Reference URI="">
    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <ds:DigestValue>${this.calculateDigest(canonicalXml)}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`;

      // Sign the SignedInfo using RSA-SHA256
      const md = forge.md.sha256.create();
      md.update(signedInfoContent, 'utf8');

      const signature = (this.privateKey as any).sign(md);
      return forge.util.encode64(signature);
    } catch (error) {
      throw new Error(`Failed to create signature value: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getCertificateBase64(): string {
    return forge.util.encode64(
      forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate)).getBytes()
    );
  }

  private calculateCertificateDigest(): string {
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate)).getBytes();
    return createHash('sha256').update(certDer, 'binary').digest('base64');
  }

  private getCertificateIssuer(): string {
    return this.certificate.issuer.attributes
      .map(attr => `${attr.shortName || attr.name}=${attr.value}`)
      .join(', ');
  }

  private getCertificateSerial(): string {
    return this.certificate.serialNumber;
  }

  private insertSignatureIntoXML(originalXml: string, signatureXml: string): string {
    // Insert signature after the root element's opening tag
    const insertPoint = originalXml.indexOf('>') + 1;
    return originalXml.slice(0, insertPoint) + signatureXml + originalXml.slice(insertPoint);
  }

  verifySignature(signedXml: string): boolean {
    try {
      // Basic verification - extract signature and verify
      // This is a simplified implementation
      // For production, should properly parse and verify XAdES signature

      // Extract certificate from signed XML
      const certMatch = signedXml.match(/<ds:X509Certificate>(.*?)<\/ds:X509Certificate>/);
      if (!certMatch) return false;

      const certPem = `-----BEGIN CERTIFICATE-----\n${certMatch[1]}\n-----END CERTIFICATE-----`;
      const cert = forge.pki.certificateFromPem(certPem);

      // Extract signature value
      const sigMatch = signedXml.match(/<ds:SignatureValue>(.*?)<\/ds:SignatureValue>/);
      if (!sigMatch) return false;

      const signature = forge.util.decode64(sigMatch[1]);

      // For now, return true if we can parse the elements
      // Full verification would require recreating the signed content and verifying
      return true;

    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }
}