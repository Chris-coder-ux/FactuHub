import { NextResponse } from 'next/server';

/**
 * Service Worker for offline caching
 * Implements cache strategies for different resource types
 */
export async function GET() {
  const CACHE_VERSION = 'v1';
  const STATIC_CACHE = `static-${CACHE_VERSION}`;
  const API_CACHE = `api-${CACHE_VERSION}`;
  const IMAGE_CACHE = `images-${CACHE_VERSION}`;
  const MAX_CACHE_SIZE = 50; // Maximum number of cached items per cache

  const swCode = `
// Service Worker - Cache Strategy Implementation
const CACHE_VERSION = '${CACHE_VERSION}';
const STATIC_CACHE = '${STATIC_CACHE}';
const API_CACHE = '${API_CACHE}';
const IMAGE_CACHE = '${IMAGE_CACHE}';
const MAX_CACHE_SIZE = ${MAX_CACHE_SIZE};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old caches that don't match current version
            return name.startsWith('static-') || 
                   name.startsWith('api-') || 
                   name.startsWith('images-');
          })
          .filter((name) => {
            return name !== STATIC_CACHE && 
                   name !== API_CACHE && 
                   name !== IMAGE_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    // Delete oldest entries (first in array)
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Helper: Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await limitCacheSize(cacheName, MAX_CACHE_SIZE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If network fails and no cache, return error
    throw error;
  }
}

// Helper: Network-first strategy (with cache fallback)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await limitCacheSize(cacheName, MAX_CACHE_SIZE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Helper: Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Return cached version immediately
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      limitCacheSize(cacheName, MAX_CACHE_SIZE);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Ignore fetch errors in background
  });
  
  return cached || fetchPromise;
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except configured CDNs)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cloudinary.com') &&
      !url.hostname.includes('res.cloudinary.com')) {
    return;
  }
  
  // Strategy 1: Cache-first for static assets
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/_next/image') ||
      url.pathname.match(/\\.(js|css|woff|woff2|ttf|eot|svg)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Strategy 2: Cache-first for images
  if (url.pathname.startsWith('/uploads/') ||
      url.pathname.match(/\\.(jpg|jpeg|png|gif|webp|avif|svg)$/i) ||
      url.hostname.includes('cloudinary.com')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  
  // Strategy 3: Network-first for API calls (with cache fallback for offline)
  if (url.pathname.startsWith('/api/')) {
    // Don't cache POST, PUT, DELETE, PATCH requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return;
    }
    
    // Network-first for GET API requests
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }
  
  // Strategy 4: Stale-while-revalidate for HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }
  
  // Default: Network-first for everything else
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
  `.trim();

  return new NextResponse(swCode, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=0, must-revalidate', // Always check for updates
      'Service-Worker-Allowed': '/', // Allow service worker to control entire site
    },
  });
}

