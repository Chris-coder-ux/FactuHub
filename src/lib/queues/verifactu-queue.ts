/**
 * Simple in-memory queue for VeriFactu processing
 * For production, consider using Bull (Redis-based) or RabbitMQ
 */

import { logger } from '@/lib/logger';
import { VeriFactuService } from '@/lib/services/verifactu-service';

interface VeriFactuJob {
  invoiceId: string;
  companyId: string;
  attempt: number;
  maxAttempts: number;
  createdAt: number;
}

class VeriFactuQueue {
  private queue: VeriFactuJob[] = [];
  private processing = false;
  private readonly maxAttempts = 3;
  private readonly delayMs = 5000; // 5 seconds delay before processing
  private readonly retryDelayMs = 2000; // 2 seconds between retries

  /**
   * Add a job to the queue
   */
  add(job: Omit<VeriFactuJob, 'attempt' | 'maxAttempts' | 'createdAt'>): void {
    const queueJob: VeriFactuJob = {
      ...job,
      attempt: 1,
      maxAttempts: this.maxAttempts,
      createdAt: Date.now(),
    };

    this.queue.push(queueJob);
    logger.info('VeriFactu job added to queue', {
      invoiceId: job.invoiceId,
      companyId: job.companyId,
      queueSize: this.queue.length,
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      // Wait for delay before processing
      if (Date.now() - job.createdAt < this.delayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayMs - (Date.now() - job.createdAt))
        );
      }

      try {
        logger.info('Processing VeriFactu job', {
          invoiceId: job.invoiceId,
          companyId: job.companyId,
          attempt: job.attempt,
        });

        await VeriFactuService.processInvoiceAsync(job.invoiceId, job.companyId);

        logger.info('VeriFactu job completed successfully', {
          invoiceId: job.invoiceId,
          companyId: job.companyId,
          attempt: job.attempt,
        });
      } catch (error) {
        logger.error('VeriFactu job failed', {
          invoiceId: job.invoiceId,
          companyId: job.companyId,
          attempt: job.attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        // Retry if attempts remaining
        if (job.attempt < job.maxAttempts) {
          const retryJob: VeriFactuJob = {
            ...job,
            attempt: job.attempt + 1,
            createdAt: Date.now() + this.retryDelayMs * job.attempt, // Exponential backoff
          };

          // Add back to queue with delay
          setTimeout(() => {
            this.queue.push(retryJob);
            if (!this.processing) {
              this.processQueue();
            }
          }, this.retryDelayMs * job.attempt);

          logger.info('VeriFactu job scheduled for retry', {
            invoiceId: job.invoiceId,
            attempt: job.attempt + 1,
            maxAttempts: job.maxAttempts,
          });
        } else {
          logger.error('VeriFactu job exhausted all retries', {
            invoiceId: job.invoiceId,
            companyId: job.companyId,
            maxAttempts: job.maxAttempts,
          });
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue size (for monitoring)
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue (for testing/cleanup)
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }
}

// Singleton instance
export const veriFactuQueue = new VeriFactuQueue();

