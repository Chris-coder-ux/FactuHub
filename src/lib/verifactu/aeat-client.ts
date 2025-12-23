// AEAT Client for VeriFactu submissions
// Handles SOAP communication with AEAT web services using certificate authentication

import * as https from 'https';
import { readFileSync } from 'node:fs';
import * as crypto from 'crypto';
import { VeriFactuConfig } from './types';
import { logger } from '@/lib/logger';
import { createPinnedHttpsAgent } from '@/lib/security/certificate-pinning';

// Re-export types for backward compatibility
export interface AeatResponse {
  EstadoEnvio: string;
  CSV?: string;
  DescripcionErrorRegistro?: string[];
  TimestampUltimaModificacion?: string;
  [key: string]: any; // Allow additional properties from AEAT
}

export class VeriFactuAeatClient {
  private config: VeriFactuConfig;
  private httpsAgent: https.Agent;
  private retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };

  constructor(config: VeriFactuConfig, retryConfig?: { maxRetries?: number; baseDelay?: number; maxDelay?: number }) {
    this.config = config;
    this.httpsAgent = this.createHttpsAgent();
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      baseDelay: retryConfig?.baseDelay ?? 1000, // 1 second
      maxDelay: retryConfig?.maxDelay ?? 30000, // 30 seconds
    };
  }

  private createHttpsAgent(): https.Agent {
    // Create certificate-based authentication
    const cert = readFileSync(this.config.certificate.path);
    const key = cert; // For P12 certificates, key is same as cert

    const baseAgent = new https.Agent({
      cert,
      key,
      passphrase: this.config.certificate.password,
      rejectUnauthorized: this.config.environment === 'production',
      // AEAT specific SSL configuration
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    });

    // Add certificate pinning for AEAT
    const hostname = this.config.environment === 'production'
      ? 'www.agenciatributaria.es'
      : 'prewww.agenciatributaria.es';

    return createPinnedHttpsAgent(hostname, baseAgent);
  }

  private getEndpoint(): string {
    return this.config.environment === 'production'
      ? 'https://www.agenciatributaria.es/static_files/common/internet/de/aeat/verifactu/ws/'
      : 'https://prewww.agenciatributaria.es/static_files/common/internet/de/aeat/verifactu/ws/';
  }

  /**
   * Send VeriFactu XML to AEAT
   */
  async submitXML(xmlContent: string): Promise<AeatResponse> {
    const soapEnvelope = this.createSoapEnvelope(xmlContent);
    const endpoint = `${this.getEndpoint()}SuministroFactEmitidas.wsdl`;

    const response = await this.makeSoapRequestWithRetry(endpoint, soapEnvelope, 'submitXML');
    return this.parseSoapResponse(response);
  }

  /**
   * Check the status of a previously sent VeriFactu
   */
  async checkStatus(csv: string): Promise<AeatResponse> {
    const soapEnvelope = this.createStatusSoapEnvelope(csv);
    const endpoint = `${this.getEndpoint()}ConsultaFactEmitidas.wsdl`;

    const response = await this.makeSoapRequestWithRetry(endpoint, soapEnvelope, 'checkStatus');
    return this.parseSoapResponse(response);
  }

  private createSoapEnvelope(xmlContent: string): string {
    // Create SOAP envelope for SuministroFactEmitidas
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ver="https://www.agenciatributaria.es/static_files/common/internet/de/aeat/verifactu/1.0/">
  <soapenv:Header/>
  <soapenv:Body>
    <ver:SuministroFactEmitidas>
      <ver:SuministroInformacion>
        ${xmlContent}
      </ver:SuministroInformacion>
    </ver:SuministroFactEmitidas>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private createStatusSoapEnvelope(csv: string): string {
    // Create SOAP envelope for ConsultaFactEmitidas
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ver="https://www.agenciatributaria.es/static_files/common/internet/de/aeat/verifactu/1.0/">
  <soapenv:Header/>
  <soapenv:Body>
    <ver:ConsultaFactEmitidas>
      <ver:FiltroConsulta>
        <ver:CSV>${csv}</ver:CSV>
      </ver:FiltroConsulta>
    </ver:ConsultaFactEmitidas>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private async makeSoapRequestWithRetry(endpoint: string, soapEnvelope: string, operation: string): Promise<string> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        logger.info(`VeriFactu ${operation} - Attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}`, {
          endpoint,
          environment: this.config.environment,
          attempt: attempt + 1
        });

        const result = await this.makeSoapRequest(endpoint, soapEnvelope);

        if (attempt > 0) {
          logger.info(`VeriFactu ${operation} succeeded after ${attempt + 1} attempts`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(`VeriFactu ${operation} attempt ${attempt + 1} failed: ${lastError.message}`, {
          endpoint,
          environment: this.config.environment,
          attempt: attempt + 1,
          error: lastError.message
        });

        // Don't retry on the last attempt
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
          );

          logger.info(`Retrying VeriFactu ${operation} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    logger.error(`VeriFactu ${operation} failed after ${this.retryConfig.maxRetries + 1} attempts`, {
      endpoint,
      environment: this.config.environment,
      finalError: lastError.message
    });

    throw lastError;
  }

  private async makeSoapRequest(endpoint: string, soapEnvelope: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
          'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
          'User-Agent': 'VeriFactu-Client/1.0',
        },
        agent: this.httpsAgent,
        timeout: 30000, // 30 seconds timeout
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`SOAP request failed with status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`SOAP request error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SOAP request timeout'));
      });

      req.write(soapEnvelope);
      req.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseSoapResponse(soapResponse: string): AeatResponse {
    try {
      // Extract the response from SOAP envelope
      // This is a simplified parser - in production you might want to use a proper XML parser
      const responseMatch = soapResponse.match(/<Respuesta[^>]*>(.*?)<\/Respuesta[^>]*>/s);
      if (!responseMatch) {
        throw new Error('Invalid SOAP response format');
      }

      const responseXml = responseMatch[1];

      // Parse individual fields
      const estadoMatch = responseXml.match(/<EstadoEnvio[^>]*>(.*?)<\/EstadoEnvio[^>]*>/);
      const csvMatch = responseXml.match(/<CSV[^>]*>(.*?)<\/CSV[^>]*>/);
      const timestampMatch = responseXml.match(/<TimestampUltimaModificacion[^>]*>(.*?)<\/TimestampUltimaModificacion[^>]*>/);
      const numeroMatch = responseXml.match(/<NumeroRegistroAcuseRecibo[^>]*>(.*?)<\/NumeroRegistroAcuseRecibo[^>]*>/);
      const errorMatches = responseXml.match(/<DescripcionErrorRegistro[^>]*>(.*?)<\/DescripcionErrorRegistro[^>]*>/g);

      const errors: string[] = [];
      if (errorMatches) {
        errorMatches.forEach(match => {
          const errorMatch = match.match(/<DescripcionErrorRegistro[^>]*>(.*?)<\/DescripcionErrorRegistro[^>]*>/);
          if (errorMatch) {
            errors.push(errorMatch[1]);
          }
        });
      }

      return {
        EstadoEnvio: estadoMatch ? estadoMatch[1] : '1', // Default to error if not found
        CSV: csvMatch ? csvMatch[1] : undefined,
        TimestampUltimaModificacion: timestampMatch ? timestampMatch[1] : undefined,
        NumeroRegistroAcuseRecibo: numeroMatch ? numeroMatch[1] : undefined,
        DescripcionErrorRegistro: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error parsing SOAP response:', error);
      return {
        EstadoEnvio: '1',
        DescripcionErrorRegistro: ['Error parsing AEAT response'],
      };
    }
  }

  /**
   * Validate certificate before use
   */
  validateCertificate(): boolean {
    try {
      const cert = readFileSync(this.config.certificate.path);
      // Basic validation - check if file exists and has content
      return cert.length > 0;
    } catch (error) {
      logger.error('Certificate validation failed', error);
      return false;
    }
  }

  /**
   * Get certificate information (for debugging)
   */
  getCertificateInfo(): any {
    try {
      const cert = readFileSync(this.config.certificate.path);
      // This is a simplified info - in production you might want to parse the certificate
      return {
        size: cert.length,
        path: this.config.certificate.path,
        hasPassword: !!this.config.certificate.password,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// Legacy alias for backward compatibility
export const AeatClient = VeriFactuAeatClient;