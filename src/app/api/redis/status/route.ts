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

    // Get queue size
    const queueSize = await veriFactuQueue.getSize();

    // Check if Bull is being used (Redis is configured)
    const isUsingBull = veriFactuQueue.usingBull;

    return NextResponse.json({
      success: true,
      data: {
        connected: isUsingBull,
        usingBull: isUsingBull,
        queueSize,
        error: isUsingBull ? undefined : 'Redis no configurado. Usando cola in-memory.',
      },
    });
  } catch (error) {
    logger.error('Error fetching Redis status', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el estado de Redis',
      },
      { status: 500 }
    );
  }
}

