/**
 * Metrics Service
 * Tracks performance metrics and sends them to Sentry
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export class MetricsService {
  private static sentryEnabled = !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  /**
   * Track a performance metric
   */
  static trackMetric(data: MetricData): void {
    if (!this.sentryEnabled) {
      logger.debug('Metric tracked (Sentry disabled)', data);
      return;
    }

    try {
      Sentry.metrics.distribution(data.name, data.value, {
        unit: data.unit || 'none',
        attributes: data.tags || {},
      });
    } catch (error) {
      logger.error('Error tracking metric', error);
    }
  }

  /**
   * Track API endpoint performance
   */
  static trackApiPerformance(
    endpoint: string,
    duration: number,
    statusCode: number,
    method: string = 'GET'
  ): void {
    this.trackMetric({
      name: 'api.request.duration',
      value: duration,
      unit: 'millisecond',
      tags: {
        endpoint,
        method,
        statusCode: statusCode.toString(),
        status: statusCode >= 400 ? 'error' : 'success',
      },
    });
  }

  /**
   * Track database query performance
   */
  static trackDbQuery(
    collection: string,
    operation: string,
    duration: number,
    success: boolean = true
  ): void {
    this.trackMetric({
      name: 'db.query.duration',
      value: duration,
      unit: 'millisecond',
      tags: {
        collection,
        operation,
        success: success.toString(),
      },
    });
  }

  /**
   * Track cache hit/miss
   */
  static trackCache(cacheKey: string, hit: boolean, duration?: number): void {
    this.trackMetric({
      name: 'cache.operation',
      value: hit ? 1 : 0,
      unit: 'none',
      tags: {
        key: cacheKey.substring(0, 50), // Limit key length
        hit: hit.toString(),
      },
    });

    if (duration !== undefined) {
      this.trackMetric({
        name: 'cache.duration',
        value: duration,
        unit: 'millisecond',
        tags: {
          key: cacheKey.substring(0, 50),
          hit: hit.toString(),
        },
      });
    }
  }

  /**
   * Track custom business metric
   */
  static trackBusinessMetric(
    metricName: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.trackMetric({
      name: `business.${metricName}`,
      value,
      unit: 'none',
      tags,
    });
  }

  /**
   * Increment a counter
   */
  static incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    if (!this.sentryEnabled) {
      logger.debug('Counter incremented (Sentry disabled)', { name, value, tags });
      return;
    }

    try {
      Sentry.metrics.count(name, value, {
        attributes: tags || {},
      });
    } catch (error) {
      logger.error('Error incrementing counter', error);
    }
  }

  /**
   * Set a gauge value
   */
  static setGauge(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.sentryEnabled) {
      logger.debug('Gauge set (Sentry disabled)', { name, value, tags });
      return;
    }

    try {
      Sentry.metrics.gauge(name, value, {
        attributes: tags || {},
      });
    } catch (error) {
      logger.error('Error setting gauge', error);
    }
  }
}

