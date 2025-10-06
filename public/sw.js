/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: sw.js; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\public\sw.js; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// PRODUCTION SERVICE WORKER (v5)
// Strategy:
// - Precache core shell assets.
// - Network-first for root and index.html (ensures updates propagate).
// - Cache-first for static immutable assets (icons, manifest, favicon, built CSS/JS hashed files).
// - Runtime cache (stale-while-revalidate) for images with size limit.

const VERSION = 'v5';
const PRECACHE = `agent-lee-core-${VERSION}`;
const RUNTIME = `agent-lee-runtime-${VERSION}`;

// Core shell (adjust if build outputs differ)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon-agent-lee.ico',
  '/images/icon-192.png',
  '/images/icon-512.png'
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

  // Network-first for root and index.html
  if (url.pathname === '/' || url.pathname === '/index.html') {
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

  // Icons / manifest / favicon -> cache-first
  if (/^\/favicon-agent-lee\.ico$|^\/manifest\.webmanifest$|^\/images\/icon-(192|512)\.png$/.test(url.pathname)) {
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
