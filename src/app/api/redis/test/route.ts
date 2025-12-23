/**
 * POST /api/redis/test
 * Tests Redis connection with provided configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { requireCompanyContext } from '@/lib/auth';
import { RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const testConfigSchema = z.object({
  url: z.string().optional(),
  host: z.string().optional(),
  port: z.string().optional(),
  password: z.string().optional(),
  tls: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    // Verify user has permission to manage settings
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    const body = await request.json();
    const validated = testConfigSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuración inválida',
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const config = validated.data;
    let redisConfig: RedisOptions;

    // Build Redis configuration
    if (config.url) {
      try {
        const url = new URL(config.url);
        redisConfig = {
          host: url.hostname,
          port: Number.parseInt(url.port || '6379', 10),
          password: url.password || undefined,
          db: url.pathname ? Number.parseInt(url.pathname.slice(1), 10) : 0,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true,
        };
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'URL de Redis inválida',
          },
          { status: 400 }
        );
      }
    } else if (config.host && config.port) {
      redisConfig = {
        host: config.host,
        port: Number.parseInt(config.port, 10),
        password: config.password || undefined,
        tls: config.tls ? {} : undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere URL o host+port',
        },
        { status: 400 }
      );
    }

    // Test connection
    const client = new IORedis(redisConfig);

    try {
      await client.connect();
      await client.ping();
      await client.quit();

      logger.info('Redis connection test successful', {
        userId: session.user.id,
        companyId,
        host: redisConfig.host,
      });

      return NextResponse.json({
        success: true,
        message: 'Conexión Redis exitosa',
      });
    } catch (error) {
      await client.quit().catch(() => {
        // Ignore quit errors
      });

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Redis connection test failed', {
        error: errorMessage,
        userId: session.user.id,
        companyId,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Error testing Redis connection', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al probar la conexión',
      },
      { status: 500 }
    );
  }
}

