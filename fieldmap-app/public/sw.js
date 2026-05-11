/* Fieldmap service worker — minimal cache-first app-shell strategy.
 *
 * Goals (smoke-test era):
 *   1. App loads when offline after first visit.
 *   2. Updates ship cleanly when the user reloads (no "stuck on old build").
 *
 * Strategy:
 *   - Bump CACHE_VERSION on every meaningful release; the activate handler
 *     deletes every cache that doesn't match the current version.
 *   - Same-origin GET requests: try the network first, fall back to cache
 *     when offline. This keeps the app feeling fresh on a normal connection
 *     while still working in the field.
 *   - Cross-origin requests (e.g. map tile servers): pass through to the
 *     network with no caching. Tile-cache lives at the app layer (IndexedDB
 *     via the existing storage code) — the SW should not double-cache it.
 */

const CACHE_VERSION = 'fieldmap-v1';

// Pre-cache the minimum needed to boot. The hashed JS/CSS bundles will be
// cached opportunistically on first visit by the fetch handler below.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // Activate this SW immediately rather than waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GETs — never cache POST/PUT/etc.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin (tile servers, fonts, etc.) — let the network handle.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        // Network-first so users get fresh code on a normal connection.
        const fresh = await fetch(req);
        // Only cache OK responses to avoid poisoning the cache with errors.
        if (fresh && fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_err) {
        // Offline — try the cache. SPA navigation fallback: if a navigation
        // request misses, serve the cached index.html so the React app can
        // render and route to the right screen.
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        // Nothing useful to return; rethrow so the browser shows offline UI.
        throw _err;
      }
    })(),
  );
});
