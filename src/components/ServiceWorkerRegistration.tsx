'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 * Registers the service worker for offline caching
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in browser
    if (typeof window === 'undefined') {
      return;
    }
    
    // In development, only register if explicitly enabled
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_SW !== 'true') {
      return;
    }

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          logger.info('Service Worker registered', {
            scope: registration.scope,
            active: registration.active?.scriptURL,
          });

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  logger.info('New service worker available');
                  // Optionally show a toast notification to refresh
                }
              });
            }
          });

          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        } catch (error) {
          logger.error('Service Worker registration failed', error);
        }
      };

      // Register after page load
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

