/**
 * Service Worker for Aggressive Image Caching
 * 
 * Implements Cache-First strategy for images to enable instant repeat visits
 * (Pinterest/Instagram style)
 */

const CACHE_NAME = 'soma-images-v1';
const IMAGE_CACHE_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 year

// Install event - set up cache
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch event - Network-First strategy for images (more reliable)
// Changed from Cache-First to Network-First to ensure images always load
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle images from Cloudflare CDN and Firebase Storage
  const isImage = event.request.destination === 'image' ||
                  url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i) ||
                  url.hostname.includes('imagedelivery.net') ||
                  url.hostname.includes('cloudflarestream.com') ||
                  url.hostname.includes('firebasestorage.googleapis.com') ||
                  url.hostname.includes('firebasestorage.app');
  
  if (!isImage) {
    return; // Let browser handle non-images
  }
  
  // Network-First strategy: Try network first, fallback to cache
  // This ensures images always load even if cache is stale
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          // Clone response (stream can only be consumed once)
          const responseToCache = response.clone();
          
          // Cache the response in background
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch((error) => {
        console.error('[SW] Network fetch failed, trying cache:', error);
        // Network failed - try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Both network and cache failed - let browser handle it
          throw error;
        });
      })
  );
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

