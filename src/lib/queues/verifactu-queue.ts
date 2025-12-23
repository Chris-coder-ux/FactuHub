/**
 * VeriFactu Queue using Bull (Redis-based) for production scalability
 * Falls back to in-memory queue if Redis is not available
 */

import Bull, { Queue, Job } from 'bull';
import { RedisOptions } from 'ioredis';
import { logger } from '@/lib/logger';
import { VeriFactuService } from '@/lib/services/verifactu-service';

interface VeriFactuJobData {
  invoiceId: string;
  companyId: string;
}

interface VeriFactuJob {
  invoiceId: string;
  companyId: string;
  attempt: number;
  maxAttempts: number;
  createdAt: number;
}

/**
 * Get Redis connection configuration for Bull
 * Supports:
 * - REDIS_URL (formato: redis://[:password@]host:port[/db])
 * - REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (variables individuales)
 * - UPSTASH_REDIS_URL (Upstash Redis tradicional, no REST)
 * 
 * Nota: Bull requiere conexión Redis tradicional (no REST API).
 * Si usas Upstash, necesitas la conexión tradicional, no UPSTASH_REDIS_REST_URL.
 */
function getRedisConfig(): RedisOptions | null {
  // Try REDIS_URL first (most common for cloud providers)
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: Number.parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        db: url.pathname ? Number.parseInt(url.pathname.slice(1), 10) : 0,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        // TLS para conexiones seguras (Upstash, Redis Cloud, etc.)
        tls: url.protocol === 'rediss:' ? {} : undefined,
      };
    } catch (error) {
      logger.warn('Invalid REDIS_URL format', { error });
    }
  }

  // Try individual environment variables
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD;

  if (host && port) {
    return {
      host,
      port: Number.parseInt(port, 10),
      password: password || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // TLS si se especifica
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    };
  }

  return null;
}

class VeriFactuQueue {
  private bullQueue: Queue<VeriFactuJobData> | null = null;
  private inMemoryQueue: VeriFactuJob[] = [];
  private inMemoryProcessing = false;
  private readonly maxAttempts = 3;
  private readonly delayMs = 5000; // 5 seconds delay before processing
  private readonly retryDelayMs = 2000; // 2 seconds between retries
  private isUsingBull = false;

  /**
   * Check if Bull (Redis) is being used
   */
  get usingBull(): boolean {
    return this.isUsingBull;
  }

  constructor() {
    this.initializeQueue();
  }

  /**
   * Initialize queue (Bull if Redis available, otherwise in-memory)
   */
  private initializeQueue(): void {
    const redisConfig = getRedisConfig();

    if (redisConfig) {
      try {
        this.bullQueue = new Bull<VeriFactuJobData>('verifactu', {
          redis: redisConfig,
          defaultJobOptions: {
            attempts: this.maxAttempts,
            backoff: {
              type: 'exponential',
              delay: this.retryDelayMs,
            },
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              age: 24 * 3600, // Keep failed jobs for 24 hours
            },
            delay: this.delayMs, // Initial delay before processing
          },
        });

        // Configure worker to process jobs
        this.bullQueue.process(1, async (job: Job<VeriFactuJobData>) => {
          logger.info('Processing VeriFactu job (Bull)', {
            invoiceId: job.data.invoiceId,
            companyId: job.data.companyId,
            attempt: job.attemptsMade + 1,
            jobId: job.id,
          });

          try {
            await VeriFactuService.processInvoiceAsync(
              job.data.invoiceId,
              job.data.companyId
            );

            logger.info('VeriFactu job completed successfully (Bull)', {
              invoiceId: job.data.invoiceId,
              companyId: job.data.companyId,
              attempt: job.attemptsMade + 1,
              jobId: job.id,
            });
          } catch (error) {
            logger.error('VeriFactu job failed (Bull)', {
              invoiceId: job.data.invoiceId,
              companyId: job.data.companyId,
              attempt: job.attemptsMade + 1,
              jobId: job.id,
              error: error instanceof Error ? error.message : String(error),
            });
            // Bull will handle retry automatically based on configuration
            throw error;
          }
        });

        // Event handlers for monitoring
        this.bullQueue.on('completed', (job: Job<VeriFactuJobData>) => {
          logger.info('VeriFactu job completed', {
            invoiceId: job.data.invoiceId,
            companyId: job.data.companyId,
            jobId: job.id,
          });
        });

        this.bullQueue.on('failed', (job: Job<VeriFactuJobData> | undefined, error: Error) => {
          if (job) {
            logger.error('VeriFactu job failed after all retries', {
              invoiceId: job.data.invoiceId,
              companyId: job.data.companyId,
              jobId: job.id,
              attempts: job.attemptsMade,
              error: error.message,
            });
          }
        });

        this.isUsingBull = true;
        logger.info('VeriFactu queue initialized with Bull (Redis-based)');
      } catch (error) {
        logger.error('Failed to initialize Bull queue, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.bullQueue = null;
        this.isUsingBull = false;
      }
    } else {
      logger.warn(
        'Redis not configured (REDIS_URL or REDIS_HOST/REDIS_PORT required), using in-memory queue'
      );
      this.isUsingBull = false;
    }
  }

  /**
   * Add a job to the queue
   */
  async add(job: Omit<VeriFactuJob, 'attempt' | 'maxAttempts' | 'createdAt'>): Promise<void> {
    if (this.isUsingBull && this.bullQueue) {
      // Use Bull queue
      await this.bullQueue.add(job, {
        delay: this.delayMs,
      });

      const queueSize = await this.bullQueue.getWaitingCount();
      logger.info('VeriFactu job added to Bull queue', {
        invoiceId: job.invoiceId,
        companyId: job.companyId,
        queueSize,
      });
    } else {
      // Fallback to in-memory queue
      const queueJob: VeriFactuJob = {
        ...job,
        attempt: 1,
        maxAttempts: this.maxAttempts,
        createdAt: Date.now(),
      };

      this.inMemoryQueue.push(queueJob);
      logger.info('VeriFactu job added to in-memory queue', {
        invoiceId: job.invoiceId,
        companyId: job.companyId,
        queueSize: this.inMemoryQueue.length,
      });

      // Start processing if not already running
      if (!this.inMemoryProcessing) {
        this.processInMemoryQueue();
      }
    }
  }

  /**
   * Process in-memory queue (fallback when Redis is not available)
   */
  private async processInMemoryQueue(): Promise<void> {
    if (this.inMemoryProcessing || this.inMemoryQueue.length === 0) {
      return;
    }

    this.inMemoryProcessing = true;

    while (this.inMemoryQueue.length > 0) {
      const job = this.inMemoryQueue.shift();
      if (!job) break;

      // Wait for delay before processing
      if (Date.now() - job.createdAt < this.delayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayMs - (Date.now() - job.createdAt))
        );
      }

      try {
        logger.info('Processing VeriFactu job (in-memory)', {
          invoiceId: job.invoiceId,
          companyId: job.companyId,
          attempt: job.attempt,
        });

        await VeriFactuService.processInvoiceAsync(job.invoiceId, job.companyId);

        logger.info('VeriFactu job completed successfully (in-memory)', {
          invoiceId: job.invoiceId,
          companyId: job.companyId,
          attempt: job.attempt,
        });
      } catch (error) {
        logger.error('VeriFactu job failed (in-memory)', {
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
            this.inMemoryQueue.push(retryJob);
            if (!this.inMemoryProcessing) {
              this.processInMemoryQueue();
            }
          }, this.retryDelayMs * job.attempt);

          logger.info('VeriFactu job scheduled for retry (in-memory)', {
            invoiceId: job.invoiceId,
            attempt: job.attempt + 1,
            maxAttempts: job.maxAttempts,
          });
        } else {
          logger.error('VeriFactu job exhausted all retries (in-memory)', {
            invoiceId: job.invoiceId,
            companyId: job.companyId,
            maxAttempts: job.maxAttempts,
          });
        }
      }
    }

    this.inMemoryProcessing = false;
  }

  /**
   * Get queue size (for monitoring)
   * Safe method that won't throw errors if Redis is unavailable
   */
  async getSize(): Promise<number> {
    if (this.isUsingBull && this.bullQueue) {
      try {
        const [waiting, active, delayed, failed] = await Promise.all([
          this.bullQueue.getWaitingCount(),
          this.bullQueue.getActiveCount(),
          this.bullQueue.getDelayedCount(),
          this.bullQueue.getFailedCount(),
        ]);
        return waiting + active + delayed + failed;
      } catch (error) {
        // If Bull/Redis fails, fall back to in-memory queue size
        logger.warn('Failed to get Bull queue size, using in-memory queue', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Mark as not using Bull if connection fails
        this.isUsingBull = false;
        return this.inMemoryQueue.length;
      }
    }
    return this.inMemoryQueue.length;
  }

  /**
   * Clear queue (for testing/cleanup)
   */
  async clear(): Promise<void> {
    if (this.isUsingBull && this.bullQueue) {
      await this.bullQueue.empty();
      await this.bullQueue.clean(0, 'completed');
      await this.bullQueue.clean(0, 'failed');
    } else {
      this.inMemoryQueue = [];
      this.inMemoryProcessing = false;
    }
  }

  /**
   * Close queue connection (for graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.bullQueue) {
      await this.bullQueue.close();
    }
  }
}

// Singleton instance
export const veriFactuQueue = new VeriFactuQueue();

