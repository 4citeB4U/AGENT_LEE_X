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
import './src/styles/tailwind.css';

// In dev, redirect /AGENT_LEE_X/* to root to avoid 404s when using prod path locally
if (import.meta.env.DEV && location.pathname.startsWith('/AGENT_LEE_X')) {
  const newUrl = location.origin + '/' + (location.hash || '');
  location.replace(newUrl);
}

// Force rebuild trigger for GitHub Pages fix

// Simple error boundary that doesn't interfere with normal app operation
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Only handle actual errors, not API key issues
    if (error.message === 'MISSING_API_KEY') {
      return { hasError: false }; // Let the app handle this
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Don't interfere with API key errors - let the app handle them
    if (error.message === 'MISSING_API_KEY') {
      return;
    }
    
    document.body.innerHTML = `
      <div class="text-white bg-[#1a1a1a] p-5 font-mono">
        <h1>Agent Lee X - Error</h1>
        <p>Error: ${error.message}</p>
        <pre>${error.stack}</pre>
        <p>BASE_URL: ${import.meta.env.BASE_URL}</p>
        <p>DEV: ${import.meta.env.DEV}</p>
        <p>MODE: ${import.meta.env.MODE}</p>
      </div>
    `;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-white bg-[#1a1a1a] p-5">
          <h1>Something went wrong in Agent Lee X</h1>
          <p>Error: {this.state.error?.message}</p>
          <button aria-label="Reload app" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug logging
console.log('Agent Lee X starting...');
console.log('BASE_URL:', import.meta.env.BASE_URL);
console.log('DEV mode:', import.meta.env.DEV);
console.log('Current URL:', window.location.href);

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
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('[SW] Registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Update available');
              nw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
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

async function renderByHash() {
  const hash = window.location.hash || ''
  // Simple hash routes to avoid adding a router dependency
  if (hash.startsWith('#/dashboard')) {
    // Support nested route for KPI badges under /dashboard/kpis
    if (hash.startsWith('#/dashboard/kpis')) {
      const Mod = (await import('./src/routes/dashboard/KPIBadgePanel')).default
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <Mod />
          </ErrorBoundary>
        </React.StrictMode>
      )
      return
    }
    const Mod = (await import('./src/routes/dashboard/MarketingDashboard')).default
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Mod />
        </ErrorBoundary>
      </React.StrictMode>
    )
    return
  }
  if (hash.startsWith('#/help/capabilities')) {
    const Mod = (await import('./src/routes/help/Capabilities')).default
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Mod />
        </ErrorBoundary>
      </React.StrictMode>
    )
    return
  }
  // Default: full app (lazy import so top-level module errors surface here)
  try {
    const Mod = (await import('./App')).default;
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Mod />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (e: any) {
    console.error('Failed to load App module:', e);
    const msg = String(e?.message || e);
    const stack = String(e?.stack || '');
    document.body.innerHTML = `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background:#0b0b0b; color:#e7ffe7; min-height:100vh; padding:24px;">
        <h1 style="color:#39FF14; margin-bottom:8px;">Agent Lee X — Bootstrap Error</h1>
        <p>App failed to load. See console for details.</p>
        <pre style="white-space:pre-wrap; background:#111; border:1px solid #244; padding:12px; border-radius:8px;">${msg}</pre>
        <details style="margin-top:12px;">
          <summary>Stack trace</summary>
          <pre style="white-space:pre-wrap;">${stack}</pre>
        </details>
      </div>
    `;
  }
}

// Initial render and handle navigation
renderByHash()
window.addEventListener('hashchange', renderByHash)

console.log('Agent Lee X render complete');