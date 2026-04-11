/// <reference lib="webworker" />

const CACHE_NAME = 'finiq-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// API cache configuration
const API_CACHE_CONFIG = {
  quotes: { maxAge: 5 * 60 * 1000 }, // 5 minutes
  history: { maxAge: 60 * 60 * 1000 }, // 1 hour
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[Service Worker] Static assets cached');
      // Skip waiting to activate immediately
      return (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Claim clients to take control immediately
      return (self as unknown as ServiceWorkerGlobalScope).clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with network-first strategy
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with stale-while-revalidate strategy
async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Check if cached response is still fresh
  if (cachedResponse) {
    const cachedDate = cachedResponse.headers.get('x-cache-date');
    const url = new URL(request.url);
    const isQuote = url.pathname.includes('/quote/');
    const isHistory = url.pathname.includes('/history/');

    const maxAge = isQuote ? API_CACHE_CONFIG.quotes.maxAge :
                   isHistory ? API_CACHE_CONFIG.history.maxAge : 0;

    if (cachedDate && Date.now() - parseInt(cachedDate) < maxAge) {
      // Return cached response if fresh
      return cachedResponse;
    }
  }

  try {
    // Fetch from network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone the response before caching
      const responseToCache = networkResponse.clone();

      // Add cache date header
      const headers = new Headers(responseToCache.headers);
      headers.set('x-cache-date', Date.now().toString());

      const responseWithDate = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });

      cache.put(request, responseWithDate);
    }

    return networkResponse;
  } catch (error) {
    // If network fails, return cached response (even if stale)
    if (cachedResponse) {
      console.log('[Service Worker] Serving stale cache for:', request.url);
      return cachedResponse;
    }

    // No cache available, throw error
    throw error;
  }
}

// Handle static assets with network-first, fallback to cache
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Update cache
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Last resort: return index.html for SPA navigation
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }

    throw error;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  }
});
