import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import rateLimiter, { RATE_LIMITS } from '@/lib/rate-limit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

/**
 * GET /api/security/rate-limiting
 * Get rate limiting status and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    // Check if Redis is available
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const isRedisAvailable = !!(redisUrl && redisToken);

    let metrics: {
      totalKeys?: number;
      topIdentifiers?: Array<{ identifier: string; count: number }>;
    } = {};

    // Try to get metrics from Redis if available
    if (isRedisAvailable) {
      try {
        const redis = new Redis({
          url: redisUrl!,
          token: redisToken!,
        });

        // Get all rate limit keys (this is approximate)
        // Note: In production, you might want to use SCAN for better performance
        const keys = await redis.keys('ratelimit:*');
        metrics.totalKeys = keys.length;

        // Get top identifiers (sample a few keys)
        const sampleKeys = keys.slice(0, 10);
        const topIdentifiers = await Promise.all(
          sampleKeys.map(async (key) => {
            const count = await redis.get<number>(key) || 0;
            const identifier = key.replace('ratelimit:', '');
            return { identifier, count };
          })
        );
        metrics.topIdentifiers = topIdentifiers
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      } catch (error) {
        logger.warn('Failed to get Redis metrics for rate limiting', { error });
      }
    }

    return NextResponse.json({
      enabled: true,
      usingRedis: isRedisAvailable,
      usingInMemory: !isRedisAvailable,
      limits: RATE_LIMITS,
      metrics,
    });
  } catch (error) {
    logger.error('Error fetching rate limiting status', { error });
    return NextResponse.json(
      { error: 'Failed to fetch rate limiting status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/rate-limiting/reset
 * Reset rate limit for a specific identifier
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      );
    }

    await rateLimiter.reset(identifier);

    return NextResponse.json({ 
      success: true, 
      message: `Rate limit reset for ${identifier}` 
    });
  } catch (error) {
    logger.error('Error resetting rate limit', { error });
    return NextResponse.json(
      { error: 'Failed to reset rate limit' },
      { status: 500 }
    );
  }
}

