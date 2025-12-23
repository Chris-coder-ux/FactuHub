/**
 * GET /api/redis/status
 * Returns current Redis connection status and queue information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { veriFactuQueue } from '@/lib/queues/verifactu-queue';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Check if Bull is being used (Redis is configured)
    const isUsingBull = veriFactuQueue.usingBull;

    // Get queue size (safe - won't fail if Redis is not available)
    let queueSize = 0;
    try {
      queueSize = await veriFactuQueue.getSize();
    } catch (error) {
      // If getSize fails, Redis is not available or connection failed
      logger.warn('Could not get queue size (Redis may not be available)', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: isUsingBull,
        usingBull: isUsingBull,
        queueSize,
        message: isUsingBull 
          ? 'Redis conectado y funcionando' 
          : 'Redis no configurado. Usando cola in-memory (funcional pero no distribuida).',
      },
    });
  } catch (error) {
    // Handle authentication errors separately
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autenticado',
        },
        { status: 401 }
      );
    }

    logger.error('Error fetching Redis status', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el estado de Redis',
        message: 'Redis puede no estar disponible. La aplicación funciona con cache in-memory.',
      },
      { status: 500 }
    );
  }
}

