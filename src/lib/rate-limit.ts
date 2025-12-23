/**
 * Distributed rate limiter using Redis (Upstash)
 * Falls back to in-memory rate limiting if Redis is not available
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class DistributedRateLimiter {
  private redis: Redis | null = null;
  private isRedisAvailable = false;
  // Fallback in-memory storage
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRedis();
    // Clean up old entries every minute (for in-memory fallback)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
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
        logger.info('Distributed rate limiter initialized with Redis');
      } else {
        logger.warn('Redis credentials not found for rate limiting, using in-memory fallback');
        this.isRedisAvailable = false;
      }
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting, using in-memory fallback', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Check if a request should be rate limited
   * Uses Redis for distributed rate limiting, falls back to in-memory
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and retry info
   */
  async check(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    // Use Redis if available (distributed rate limiting)
    if (this.isRedisAvailable && this.redis) {
      return this.checkWithRedis(identifier, limit, windowMs);
    }

    // Fallback to in-memory rate limiting
    return this.checkInMemory(identifier, limit, windowMs);
  }

  /**
   * Redis-based rate limiting (distributed)
   */
  private async checkWithRedis(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.redis) {
      // Fallback if Redis is null
      return this.checkInMemory(identifier, limit, windowMs);
    }

    try {
      const key = `ratelimit:${identifier}`;
      const windowSeconds = Math.ceil(windowMs / 1000);
      const now = Date.now();
      const resetTime = now + windowMs;

      // Use Redis INCR with expiration
      // If key doesn't exist, it will be created with value 1 and expiration
      const current = await this.redis.incr(key);

      // Set expiration on first request (when count is 1)
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);

      return {
        allowed,
        remaining,
        resetTime,
      };
    } catch (error) {
      logger.error('Redis rate limit check failed, falling back to in-memory', error);
      // Fallback to in-memory on Redis error
      return this.checkInMemory(identifier, limit, windowMs);
    }
  }

  /**
   * In-memory rate limiting (fallback)
   */
  private checkInMemory(
    identifier: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const key = `ratelimit:${identifier}`;
        await this.redis.del(key);
      } catch (error) {
        logger.error('Failed to reset rate limit in Redis', error);
      }
    }
    this.requests.delete(identifier);
  }

  /**
   * Clean up and stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Singleton instance
const rateLimiter = new DistributedRateLimiter();

export default rateLimiter;

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  return ip;
}

/**
 * Get company identifier from request (for company-based rate limiting)
 */
export function getCompanyIdentifier(request: Request): string | null {
  // Try to get companyId from headers or session
  const companyId = request.headers.get('x-company-id');
  return companyId;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // API endpoints - moderate limits
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Mutation endpoints - stricter limits
  mutation: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Email sending - very strict
  email: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;
