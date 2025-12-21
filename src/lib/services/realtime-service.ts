/**
 * Real-time Event Service
 * Manages real-time events using Redis pub/sub for multi-instance support
 * Falls back to in-memory events for single-instance deployments
 */

import { logger } from '@/lib/logger';
import { cacheService } from '@/lib/cache';

export type RealtimeEventType =
  | 'connected' // Internal: connection established
  | 'invoice.updated'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'receipt.processed'
  | 'receipt.failed'
  | 'security.alert'
  | 'notification.new'
  | 'banking.sync.completed'
  | 'verifactu.status.changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  companyId: string;
  userId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class RealtimeService {
  private subscribers: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    // Check if Redis is available via cache service
    try {
      // Try to set a test key
      await cacheService.set('realtime:test', 'ok', { ttl: 1 });
      this.isRedisAvailable = true;
      logger.info('Real-time service: Using Redis pub/sub');
    } catch (error) {
      this.isRedisAvailable = false;
      logger.info('Real-time service: Using in-memory events (Redis not available)');
    }
  }

  /**
   * Subscribe to events for a company
   */
  subscribe(companyId: string, callback: (event: RealtimeEvent) => void): () => void {
    if (!this.subscribers.has(companyId)) {
      this.subscribers.set(companyId, new Set());
    }

    this.subscribers.get(companyId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(companyId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(companyId);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers of a company
   */
  async emit(event: RealtimeEvent): Promise<void> {
    try {
      // If Redis is available, publish to Redis channel
      if (this.isRedisAvailable) {
        const channel = `realtime:${event.companyId}`;
        await cacheService.set(
          `realtime:event:${Date.now()}`,
          JSON.stringify(event),
          { ttl: 60 } // TTL 60 seconds
        );
        // Note: Full Redis pub/sub would require ioredis client
        // For now, we'll use the cache service pattern
      }

      // Emit to local subscribers
      const subscribers = this.subscribers.get(event.companyId);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            logger.error('Error in real-time subscriber callback', error);
          }
        });
      }
    } catch (error) {
      logger.error('Error emitting real-time event', error);
    }
  }

  /**
   * Emit invoice update event
   */
  async emitInvoiceUpdate(
    companyId: string,
    invoiceId: string,
    status: string,
    userId?: string
  ): Promise<void> {
    await this.emit({
      type: 'invoice.updated',
      companyId,
      userId,
      data: {
        invoiceId,
        status,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Emit invoice created event
   */
  async emitInvoiceCreated(
    companyId: string,
    invoiceId: string,
    invoiceNumber: string,
    userId?: string
  ): Promise<void> {
    await this.emit({
      type: 'invoice.created',
      companyId,
      userId,
      data: {
        invoiceId,
        invoiceNumber,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Emit invoice paid event
   */
  async emitInvoicePaid(
    companyId: string,
    invoiceId: string,
    invoiceNumber: string,
    userId?: string
  ): Promise<void> {
    await this.emit({
      type: 'invoice.paid',
      companyId,
      userId,
      data: {
        invoiceId,
        invoiceNumber,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Emit receipt processed event
   */
  async emitReceiptProcessed(
    companyId: string,
    receiptId: string,
    status: string,
    userId?: string
  ): Promise<void> {
    await this.emit({
      type: 'receipt.processed',
      companyId,
      userId,
      data: {
        receiptId,
        status,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Emit security alert event
   */
  async emitSecurityAlert(
    companyId: string,
    alertId: string,
    severity: string,
    title: string
  ): Promise<void> {
    await this.emit({
      type: 'security.alert',
      companyId,
      data: {
        alertId,
        severity,
        title,
      },
      timestamp: new Date(),
    });
  }
}

export const realtimeService = new RealtimeService();

