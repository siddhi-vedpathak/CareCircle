/**
 * CareCircle Service Worker
 * Caches static frontend assets for offline functionality.
 * STRICT RULE: NEVER caches /api routes (e.g., /api/send-email).
 */

const CACHE_NAME = 'carecircle-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/app.js',
  '/js/storage.js',
  '/js/i18n.js',
  '/js/icons.js',
  '/js/audio.js',
  '/js/demo.js',
  '/js/demoModal.js',
  '/js/pillSvg.js',
  '/js/today.js',
  '/js/medicines.js',
  '/js/info.js',
  '/js/wizard.js',
  '/js/roles.js',
  '/js/familyDashboard.js',
  '/img/hero-morning.svg',
  '/img/hero-afternoon.svg',
  '/img/hero-night.svg',
  '/img/elderly-couple.svg',
  '/img/family-welcome.svg',
  '/img/empty-no-medicines.svg',
  '/img/empty-no-appointments.svg',
  '/img/empty-no-messages.svg',
  '/img/celebration.svg',
  '/img/emergency.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT RULE: Never intercept or cache /api routes or non-GET requests
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return; // Pass through to network
  }

  // Stale-while-revalidate or Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache if online
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {
            // Offline - silence background update error
          });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for navigation if completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
