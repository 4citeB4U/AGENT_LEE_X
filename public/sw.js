/*
LEEWAY HEADER
TAG: FRONTEND.PWA.SERVICE_WORKER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: hard-drive-download
ICON_SIG: CD534113
5WH: WHAT=Production service worker for SPA; WHY=PWA caching & offline behavior; WHO=Leeway Core; WHERE=public/sw.js; WHEN=2025-10-19; HOW=Service Worker API
SPDX-License-Identifier: MIT
*/

// PRODUCTION SERVICE WORKER (v5)
// Strategy:
// - Precache core shell assets.
// - Network-first for root and index.html (ensures updates propagate).
// - Cache-first for static immutable assets (icons, manifest, favicon, built CSS/JS hashed files).
// - Runtime cache (stale-while-revalidate) for images with size limit.

const VERSION = 'v6'; // Increment version to force update
const PRECACHE = `agent-lee-core-${VERSION}`;
const RUNTIME = `agent-lee-runtime-${VERSION}`;

// Core shell (use GitHub Pages base path)
// Determine base URL at runtime for dev vs GitHub Pages
const BASE_URL = self?.location?.pathname?.includes('/AGENT_LEE_X/') ? '/AGENT_LEE_X/' : (self.__BASE_URL__ || '/');
const PRECACHE_URLS = [
  BASE_URL,
  `${BASE_URL}index.html`,
  `${BASE_URL}manifest.webmanifest`,
  `${BASE_URL}favicon-agent-lee.ico`,
  `${BASE_URL}images/icon-192.png`,
  `${BASE_URL}images/icon-512.png`
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
  console.log('[SW] Installed', VERSION);
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter(n => ![PRECACHE, RUNTIME].includes(n)).map(n => caches.delete(n))
      );
      await self.clients.claim();
      console.log('[SW] Activated', VERSION);
    })()
  );
});

function isHashedAsset(urlPath) {
  return /\.[a-f0-9]{8,}\.\w+$/.test(urlPath);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Only same-origin

  // Network-first for root and index.html (updated for GitHub Pages base path)
  if (url.pathname === BASE_URL || url.pathname === BASE_URL.slice(0, -1) || url.pathname === `${BASE_URL}index.html`) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(PRECACHE).then(c => c.put(request, copy));
          return resp;
        })
        .catch(async () => (await caches.match(request)) || new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Immutable hashed build file -> cache-first
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        caches.open(PRECACHE).then(c => c.put(request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // Icons / manifest / favicon -> cache-first (updated for GitHub Pages base path)
  if (new RegExp(`^${BASE_URL}favicon-agent-lee\\.ico$|^${BASE_URL}manifest\\.webmanifest$|^${BASE_URL}images/icon-(192|512)\\.png$`).test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        caches.open(PRECACHE).then(c => c.put(request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // Images (runtime cache, stale-while-revalidate)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then(resp => {
            cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
    return;
  }
  // Default: pass-through
});

// Listen for manual skipWaiting trigger from client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
