/**
 * Redis Cache Service
 * Provides caching functionality for frequently accessed data
 * Falls back to in-memory cache if Redis is not available
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';
import { MetricsService } from './services/metrics-service';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private isRedisAvailable = false;

  constructor() {
    this.initializeRedis();
    // Clean up expired memory cache entries every 5 minutes
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000);
  }

  private initializeRedis(): void {
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        this.redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        this.isRedisAvailable = true;
        logger.info('Redis cache initialized successfully');
      } else {
        logger.warn('Redis credentials not found, using in-memory cache');
        this.isRedisAvailable = false;
      }
    } catch (error) {
      logger.error('Failed to initialize Redis, using in-memory cache', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get<T>(key);
        const duration = Date.now() - startTime;
        MetricsService.trackCache(key, value !== null, duration);
        return value;
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        const duration = Date.now() - startTime;
        MetricsService.trackCache(key, true, duration);
        return entry.value as T;
      }

      // Expired or not found
      if (entry) {
        this.memoryCache.delete(key);
      }

      const duration = Date.now() - startTime;
      MetricsService.trackCache(key, false, duration);
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || 3600; // Default 1 hour

      if (this.isRedisAvailable && this.redis) {
        await this.redis.set(key, value, { ex: ttl });
        
        // Store tags for invalidation
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, key);
            await this.redis.expire(`tag:${tag}`, ttl);
          }
        }

        return true;
      }

      // Fallback to memory cache
      this.memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });

      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key);
        return true;
      }

      // Fallback to memory cache
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      // Memory cache doesn't support tags, skip
      return;
    }

    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      logger.error('Cache invalidation error', { tags, error });
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clean up expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        // Note: This requires FLUSHDB permission
        // For production, consider more selective clearing
        await this.redis.flushdb();
      }

      this.memoryCache.clear();
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

/**
 * Cache key generators
 */
export const cacheKeys = {
  client: (companyId: string, clientId: string) => `client:${companyId}:${clientId}`,
  clients: (companyId: string) => `clients:${companyId}`,
  product: (companyId: string, productId: string) => `product:${companyId}:${productId}`,
  products: (companyId: string) => `products:${companyId}`,
  invoice: (companyId: string, invoiceId: string) => `invoice:${companyId}:${invoiceId}`,
  invoices: (companyId: string, filters?: string) => `invoices:${companyId}:${filters || 'all'}`,
  settings: (companyId: string) => `settings:${companyId}`,
};

/**
 * Cache tags for invalidation
 */
export const cacheTags = {
  clients: (companyId: string) => `clients:${companyId}`,
  products: (companyId: string) => `products:${companyId}`,
  invoices: (companyId: string) => `invoices:${companyId}`,
  settings: (companyId: string) => `settings:${companyId}`,
};

