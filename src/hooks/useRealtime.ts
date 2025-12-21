/**
 * React hook for real-time updates using Server-Sent Events
 * 
 * Usage:
 * const { events, isConnected } = useRealtime();
 * 
 * useEffect(() => {
 *   if (events.length > 0) {
 *     const lastEvent = events[events.length - 1];
 *     if (lastEvent.type === 'invoice.updated') {
 *       // Handle invoice update
 *     }
 *   }
 * }, [events]);
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { RealtimeEvent } from '@/lib/services/realtime-service';
import { logger } from '@/lib/logger';

interface UseRealtimeOptions {
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { enabled = true, onEvent } = options;
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 3000; // Start with 3 seconds

  // Memoize onEvent to prevent unnecessary reconnections
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    // Only connect if enabled and authenticated
    if (!enabled || status !== 'authenticated' || !session?.user?.companyId) {
      return;
    }

    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Create EventSource connection
      const eventSource = new EventSource('/api/realtime/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        logger.info('SSE connection established');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      eventSource.onmessage = (e) => {
        try {
          // Ignore heartbeat messages (they start with ':')
          if (e.data.trim().startsWith(':')) {
            return;
          }

          const event = JSON.parse(e.data) as RealtimeEvent;
          
          // Ignore connection messages
          if (event.type === 'connected') {
            return;
          }
          
          // Only process events with a valid type
          if (event.type) {
            setEvents(prev => [...prev, event]);
            
            // Call custom handler if provided
            if (onEventRef.current) {
              onEventRef.current(event);
            }
          }
        } catch (error) {
          logger.error('Error parsing SSE event', { error, data: e.data });
        }
      };

      eventSource.onerror = (error) => {
        logger.warn('SSE connection error', { 
          error, 
          attempt: reconnectAttemptsRef.current,
          readyState: eventSource.readyState 
        });
        
        setIsConnected(false);
        
        // Close the current connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          
          // Exponential backoff: 3s, 6s, 12s, etc. (max 30s)
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          
          logger.info(`Attempting to reconnect SSE in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          logger.error('SSE reconnection failed: max attempts reached');
        }
      };
    } catch (error) {
      logger.error('Failed to create SSE connection', error);
      setIsConnected(false);
    }
  }, [enabled, status, session?.user?.companyId]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return {
    events,
    isConnected,
    clearEvents: () => setEvents([]),
  };
}

