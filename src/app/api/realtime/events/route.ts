/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * 
 * Usage:
 * const eventSource = new EventSource('/api/realtime/events?companyId=xxx');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Real-time update:', data);
 * };
 */

import { NextRequest } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { realtimeService, RealtimeEvent } from '@/lib/services/realtime-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Require authentication and company context
    const { session, companyId } = await requireCompanyContext();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;

        // Cleanup function
        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(heartbeatInterval);
          unsubscribe();
          try {
            controller.close();
          } catch (error) {
            // Stream may already be closed
            logger.debug('Error closing SSE stream', { error });
          }
        };

        // Safe send function that handles stream errors gracefully
        const safeSend = (data: string) => {
          if (isClosed) return;
          try {
            // Check if controller is still open before sending
            if (controller.desiredSize !== null) {
              controller.enqueue(encoder.encode(data));
            } else {
              // Stream is closed
              cleanup();
            }
          } catch (error) {
            logger.warn('Error sending SSE data, stream may be closed', { error });
            cleanup();
          }
        };

        // Send connection established message
        safeSend(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

        // Subscribe to real-time events
        const unsubscribe = realtimeService.subscribe(companyId, (event: RealtimeEvent) => {
          if (isClosed) return;
          try {
            // Only send events relevant to the user or all company events
            if (!event.userId || event.userId === session.user.id) {
              safeSend(`data: ${JSON.stringify(event)}\n\n`);
            }
          } catch (error) {
            logger.error('Error in SSE event callback', error);
          }
        });

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(heartbeatInterval);
            return;
          }
          safeSend(`: heartbeat\n\n`);
        }, 30000); // Every 30 seconds

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          logger.info('SSE client disconnected', { companyId });
          cleanup();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in nginx
      },
    });
  } catch (error) {
    logger.error('SSE connection error', error);
    return new Response(
      JSON.stringify({ error: 'Failed to establish SSE connection' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

