/* LEEWAY HEADER
TAG: FRONTEND.ENTRY.INDEX_TSX
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: play
ICON_SIG: CD534113
5WH: WHAT=React entry + SW bootstrap; WHY=Mount root & manage lifecycle; WHO=Leeway Core (agnostic); WHERE=index.tsx; WHEN=2025-10-05; HOW=React 19 + progressive SW strategy
SPDX-License-Identifier: MIT
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/styles/tailwind.css';

// Force rebuild trigger for GitHub Pages fix

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// Restore normal service worker registration for production-like behavior.
// Conditions: secure context + not dev + not certain preview hosts.
if ('serviceWorker' in navigator) {
  const meta = import.meta as unknown as { env?: { DEV?: boolean } };
  const isDev = Boolean(meta.env?.DEV);
  const isPreviewHost = location.hostname.endsWith('usercontent.goog');
  const shouldRegister = window.isSecureContext && !isDev && !isPreviewHost; // In dev, leave SW unregistered to avoid caching noise

  if (shouldRegister) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('[SW] Registered:', reg.scope);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Update available');
              // Optionally prompt user; here we auto-activate next reload:
              // Send message to skip waiting so new version takes control sooner.
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Refresh page when new SW activates
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
            refreshing = true;
            console.log('[SW] Controller changed -> reloading for fresh assets');
            window.location.reload();
        });
      }).catch(err => console.error('[SW] Registration failed', err));
    });
  } else {
    console.log('[SW] Registration skipped (dev or insecure context)');
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);