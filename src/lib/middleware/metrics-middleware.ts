/**
 * Metrics Middleware
 * Automatically tracks API performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { MetricsService } from '@/lib/services/metrics-service';

export async function metricsMiddleware(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const endpoint = url.pathname;

  try {
    const response = await handler(request);
    const duration = Date.now() - startTime;

    // Track API performance
    MetricsService.trackApiPerformance(
      endpoint,
      duration,
      response.status,
      method
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track error
    MetricsService.trackApiPerformance(
      endpoint,
      duration,
      500,
      method
    );

    throw error;
  }
}

