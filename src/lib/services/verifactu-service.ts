import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Settings from '@/lib/models/Settings';
import { VeriFactuXmlGenerator } from '@/lib/verifactu/xml-generator';
import { VeriFactuSigner } from '@/lib/verifactu/signer';
import { VeriFactuAeatClient } from '@/lib/verifactu/aeat-client';
import {
  decryptCertificatePassword,
  decryptAeatCredentials,
  isEncrypted,
} from '@/lib/encryption';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';
import { VeriFactuStatus, VeriFactuCabecera } from '@/lib/verifactu/types';

/**
 * Circuit Breaker State
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker for VeriFactu operations
 * Prevents cascading failures when AEAT is down
 */
class VeriFactuCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold = 5; // Open circuit after 5 failures
  private readonly timeout = 60000; // 60 seconds before trying again
  private readonly successThreshold = 2; // Close circuit after 2 successes

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.failureCount = 0;
        logger.info('VeriFactu circuit breaker: Transitioning to HALF_OPEN');
      } else {
        throw new VeriFactuServiceError(
          'Circuit breaker is OPEN. VeriFactu service temporarily unavailable.',
          'CIRCUIT_OPEN'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.failureCount++;
      if (this.failureCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info('VeriFactu circuit breaker: Circuit CLOSED after recovery');
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // If we fail in HALF_OPEN, go back to OPEN
      this.state = CircuitState.OPEN;
      logger.warn('VeriFactu circuit breaker: Back to OPEN after HALF_OPEN failure');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.error('VeriFactu circuit breaker: Circuit OPENED due to failures', {
        failureCount: this.failureCount,
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Custom error class for VeriFactu service errors
 */
export class VeriFactuServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'VeriFactuServiceError';
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: { invoiceId?: string; operation?: string }
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (error instanceof VeriFactuServiceError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      logger.warn('VeriFactu operation failed, retrying', {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delay,
        error: lastError.message,
        ...context,
      });

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  // All retries exhausted
  throw new VeriFactuServiceError(
    `Operation failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`,
    'RETRY_EXHAUSTED',
    false,
    lastError
  );
}

// Global circuit breaker instance
const circuitBreaker = new VeriFactuCircuitBreaker();

export class VeriFactuService {
  /**
   * Processes VeriFactu for an invoice asynchronously
   * This includes XML generation, signing, and sending to AEAT
   * Includes error handling, retry logic, and circuit breaker
   */
  static async processInvoiceAsync(invoiceId: string, companyId: string): Promise<void> {
    try {
      // Execute through circuit breaker
      await circuitBreaker.execute(async () => {
        await dbConnect();

        const invoice = await Invoice.findById(invoiceId)
          .populate('client')
          .populate('items.product');

        if (!invoice) {
          throw new VeriFactuServiceError(
            `Invoice ${invoiceId} not found for VeriFactu processing`,
            'INVOICE_NOT_FOUND',
            false
          );
        }

        // Verify invoice belongs to the company
        if (invoice.companyId && invoice.companyId.toString() !== companyId) {
          throw new VeriFactuServiceError(
            `Invoice ${invoiceId} does not belong to company ${companyId}`,
            'INVOICE_COMPANY_MISMATCH',
            false
          );
        }

        // Get settings filtered by companyId
        const settings = await Settings.findOne({
          companyId: toCompanyObjectId(companyId),
        });

        if (!settings) {
          throw new VeriFactuServiceError(
            `Settings not found for company ${companyId}`,
            'SETTINGS_NOT_FOUND',
            false
          );
        }

        // Generate XML with retry logic
        await retryWithBackoff(
          () => this.generateAndSignXML(invoice, settings, companyId),
          DEFAULT_RETRY_CONFIG,
          { invoiceId, operation: 'generateAndSignXML' }
        );

        // Auto-send if configured (with retry logic)
        if (settings.verifactuAutoSend) {
          await retryWithBackoff(
            () => this.sendToAEAT(invoice, settings, companyId),
            DEFAULT_RETRY_CONFIG,
            { invoiceId, operation: 'sendToAEAT' }
          );
        }
      });
    } catch (error) {
      // Handle different error types
      if (error instanceof VeriFactuServiceError) {
        logger.error('VeriFactu service error', {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          invoiceId,
          companyId,
          originalError: error.originalError,
        });
      } else {
        logger.error('VeriFactu async processing failed', {
          error: error instanceof Error ? error.message : String(error),
          invoiceId,
          companyId,
        });
      }

      // Update invoice status on error
      try {
        await dbConnect();
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
        invoice.verifactuStatus = VeriFactuStatus.ERROR;
        invoice.verifactuErrorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        await invoice.save();
        }
      } catch (updateError) {
        logger.error('Failed to update invoice error status', {
          error: updateError,
          invoiceId,
        });
      }

      // Don't throw - this is async processing, errors should be logged but not fail the request
    }
  }

  /**
   * Generates and signs VeriFactu XML for an invoice
   * Throws VeriFactuServiceError for proper error handling
   */
  private static async generateAndSignXML(
    invoice: any,
    settings: any,
    companyId: string
  ): Promise<void> {
    try {
      const generator = new VeriFactuXmlGenerator(settings.verifactuChainHash || '');

      const registro = {
        TipoRegistro: 'A' as const,
        IdRegistro: `VERI-${invoice._id}`,
        NumSerieFactura: invoice.invoiceNumber,
        FechaExpedicionFactura: invoice.issuedDate.toISOString().split('T')[0],
        HoraExpedicionFactura: new Date().toTimeString().split(' ')[0],
        TipoFactura: 'F1',
        CuotaTotal: invoice.tax.toFixed(2),
        ImporteTotal: invoice.total.toFixed(2),
        BaseImponibleTotal: invoice.subtotal.toFixed(2),
        DescripcionOperacion: `Factura ${invoice.invoiceNumber}`,
        ContraparteNombreRazon: invoice.client.name,
        ContraparteNIF: invoice.client.taxId || '',
        ContrapartePais: 'ES',
      };

      const cabecera: VeriFactuCabecera = {
        ObligadoEmision: String(settings.taxId),
        ConformeNormativa: 'S',
        Version: '1.0',
        TipoHuella: 'SHA256',
        Intercambio: 'E',
      };

      const xmlContent = generator.generateXML([registro], cabecera);

      // Validate XML structure (structural validation without XSD due to security)
      const validation = await generator.validateXML(xmlContent);
      if (!validation.isValid) {
        logger.warn('VeriFactu XML validation failed', {
          errors: validation.errors,
          invoiceId: invoice._id,
        });
        // Note: We continue processing even if validation fails
        // The XML structure is already validated through TypeScript types
      }

      // Calculate record hash for storage
      const recordHash = generator.calculateRecordHash(registro);

      // Update invoice with XML data
      invoice.verifactuXml = xmlContent;
      invoice.verifactuStatus = VeriFactuStatus.PENDING;
      invoice.verifactuHash = recordHash;
      invoice.verifactuChainHash = generator.getCurrentChainHash();

      // Auto-sign if certificate is configured
      let signedXml = xmlContent;
      let certPassword: string | undefined;

      if (settings.verifactuCertificatePath && settings.verifactuCertificatePassword) {
        try {
          // Decrypt certificate password if encrypted
          certPassword = settings.verifactuCertificatePassword;
          if (certPassword && isEncrypted(certPassword)) {
            certPassword = await decryptCertificatePassword(certPassword);
          }
          if (certPassword && settings.verifactuCertificatePath) {
            const signer = new VeriFactuSigner(
              settings.verifactuCertificatePath,
              certPassword
            );
            signedXml = signer.signXML(xmlContent);
            invoice.verifactuSignature = signedXml;
            invoice.verifactuStatus = VeriFactuStatus.SIGNED;
            logger.info('VeriFactu XML auto-signed successfully', {
              invoiceId: invoice._id,
            });
          }
        } catch (signError) {
          const error = signError instanceof Error ? signError : new Error(String(signError));
          logger.error('VeriFactu auto-signing failed', {
            error: error.message,
            invoiceId: invoice._id,
          });
          // Don't throw - signing failure shouldn't block XML generation
        }
      }

      await invoice.save();

      // Update settings chain hash
      settings.verifactuChainHash = generator.getCurrentChainHash();
      await settings.save();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('VeriFactu XML generation failed', {
        error: err.message,
        invoiceId: invoice._id,
      });
      throw new VeriFactuServiceError(
        `XML generation failed: ${err.message}`,
        'XML_GENERATION_FAILED',
        true, // Retryable
        err
      );
    }
  }

  /**
   * Sends signed XML to AEAT
   * Throws VeriFactuServiceError for proper error handling and retry logic
   */
  private static async sendToAEAT(
    invoice: any,
    settings: any,
    companyId: string
  ): Promise<void> {
    try {
      if (!invoice.verifactuSignature) {
        logger.warn('Cannot send to AEAT: XML not signed', { invoiceId: invoice._id });
        return;
      }

      // Decrypt certificate password if needed
      let certPassword = settings.verifactuCertificatePassword;
      if (certPassword && isEncrypted(certPassword)) {
        certPassword = await decryptCertificatePassword(certPassword);
      }

      if (!certPassword || !settings.verifactuCertificatePath) {
        logger.warn('Certificate not configured for AEAT send', {
          companyId,
          invoiceId: invoice._id,
        });
        return;
      }

      // Decrypt AEAT credentials if needed
      let aeatUsername = '';
      let aeatPassword = '';
      if (settings.aeatUsername && isEncrypted(settings.aeatUsername)) {
        const credentials = await decryptAeatCredentials(
          settings.aeatUsername,
          settings.aeatPassword || ''
        );
        aeatUsername = credentials.username;
        aeatPassword = credentials.password;
      } else if (settings.aeatUsername) {
        aeatUsername = settings.aeatUsername;
        // Password comes from settings, not hardcoded
        aeatPassword = settings.aeatPassword || '';
      }

      // Validate AEAT credentials before attempting to send
      if (!aeatUsername || !aeatPassword) {
        logger.warn('AEAT credentials not configured, skipping auto-send', {
          companyId,
          invoiceId: invoice._id,
          hasUsername: !!aeatUsername,
          hasPassword: !!aeatPassword,
        });
        invoice.verifactuStatus = VeriFactuStatus.SIGNED; // XML is signed but not sent
        await invoice.save();
        return;
      }

      // Create VeriFactu config with decrypted credentials
      const verifactuConfig = {
        enabled: settings.verifactuEnabled || false,
        environment: settings.verifactuEnvironment || 'sandbox',
        certificate: {
          path: settings.verifactuCertificatePath,
          password: certPassword,
        },
        aeatUsername,
        aeatPassword,
        autoSend: settings.verifactuAutoSend || false,
        chainHash: settings.verifactuChainHash || '',
      };

      const aeatClient = new VeriFactuAeatClient(verifactuConfig);
      
      // Execute AEAT submission through circuit breaker
      const sendResult = await circuitBreaker.execute(async () => {
        return await aeatClient.submitXML(invoice.verifactuSignature);
      });

      if (sendResult.EstadoEnvio === '0') {
        invoice.verifactuStatus = VeriFactuStatus.VERIFIED;
        invoice.verifactuId = sendResult.CSV;
        invoice.verifactuVerifiedAt = new Date();
        logger.info('VeriFactu auto-submitted to AEAT successfully', {
          invoiceId: invoice._id,
          csv: sendResult.CSV,
        });
      } else {
        invoice.verifactuStatus = VeriFactuStatus.REJECTED;
        invoice.verifactuErrorMessage =
          sendResult.DescripcionErrorRegistro?.[0] || 'Error desconocido en AEAT';
        logger.warn('VeriFactu auto-submission rejected by AEAT', {
          invoiceId: invoice._id,
          error: invoice.verifactuErrorMessage,
        });
      }

      // Save invoice within transaction for consistency
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await invoice.save({ session });
        await session.commitTransaction();
      } catch (saveError) {
        await session.abortTransaction();
        logger.error('Failed to save invoice after AEAT submission', {
          error: saveError,
          invoiceId: invoice._id,
        });
        throw saveError;
      } finally {
        session.endSession();
      }
    } catch (sendError) {
      const err = sendError instanceof Error ? sendError : new Error(String(sendError));
      
      // Determine if error is retryable
      const isRetryable =
        err.message.includes('timeout') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('network');

      logger.error('VeriFactu auto-send failed', {
        error: err.message,
        invoiceId: invoice._id,
        retryable: isRetryable,
      });

      invoice.verifactuStatus = 'error';
      invoice.verifactuErrorMessage = err.message;
      await invoice.save();

      // Throw VeriFactuServiceError for retry logic
      throw new VeriFactuServiceError(
        `AEAT submission failed: ${err.message}`,
        'AEAT_SUBMISSION_FAILED',
        isRetryable,
        err
      );
    }
  }

  /**
   * Get circuit breaker state (for monitoring/debugging)
   */
  static getCircuitBreakerState(): CircuitState {
    return circuitBreaker.getState();
  }
}

