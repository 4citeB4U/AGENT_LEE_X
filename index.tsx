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

// Add error boundary and debugging for white screen issues
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error, showApiKeyPrompt: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, showApiKeyPrompt: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is an API key error that should show the prompt
    if (error.message === 'MISSING_API_KEY') {
      return { hasError: false, showApiKeyPrompt: true, error };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Don't replace the DOM for API key errors - let the app handle them
    if (error.message === 'MISSING_API_KEY') {
      return;
    }
    
    document.body.innerHTML = `
      <div style="color: white; background: #1a1a1a; padding: 20px; font-family: monospace;">
        <h1>Agent Lee X - Error</h1>
        <p>Error: ${error.message}</p>
        <pre>${error.stack}</pre>
        <p>BASE_URL: ${import.meta.env.BASE_URL}</p>
        <p>DEV: ${import.meta.env.DEV}</p>
        <p>MODE: ${import.meta.env.MODE}</p>
      </div>
    `;
  }

  handleApiKeySet = (apiKey: string) => {
    localStorage.setItem('gemini_api_key', apiKey);
    this.setState({ showApiKeyPrompt: false });
    window.location.reload(); // Reload to reinitialize with the new API key
  };

  render() {
    if (this.state.showApiKeyPrompt) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155'
          }}>
            <h2 style={{color: '#f1f5f9', margin: '0 0 10px 0', fontSize: '24px'}}>🔑 API Key Required</h2>
            <p style={{color: '#cbd5e1', margin: '0 0 25px 0', lineHeight: 1.5}}>
              Please enter your Google Gemini API key to use Agent Lee.
            </p>
            
            <input
              id="api-key-input"
              type="password"
              placeholder="Enter your API key..."
              style={{
                width: '100%',
                padding: '12px 15px',
                background: '#0f172a',
                border: '2px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '16px',
                marginBottom: '20px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const apiKey = (e.target as HTMLInputElement).value.trim();
                  if (apiKey) this.handleApiKeySet(apiKey);
                }
              }}
            />
            
            <button 
              onClick={() => {
                const input = document.getElementById('api-key-input') as HTMLInputElement;
                const apiKey = input?.value.trim();
                if (apiKey) this.handleApiKeySet(apiKey);
              }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Continue
            </button>
            
            <div style={{color: '#cbd5e1', fontSize: '14px', lineHeight: 1.5, marginTop: '20px'}}>
              <p><strong style={{color: '#f1f5f9'}}>How to get an API key:</strong></p>
              <ol style={{margin: '10px 0', paddingLeft: '20px'}}>
                <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', textDecoration: 'none'}}>Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Create API Key"</li>
                <li>Copy and paste the key above</li>
              </ol>
              <p style={{margin: '15px 0 0 0', padding: '10px', background: '#0f172a', borderRadius: '6px', borderLeft: '3px solid #3b82f6'}}>
                💡 Your API key will be stored locally in your browser and never shared.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (this.state.hasError) {
      return (
        <div style={{color: 'white', background: '#1a1a1a', padding: '20px'}}>
          <h1>Something went wrong in Agent Lee X</h1>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
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

// Add error handling and debug info
console.log('Rendering Agent Lee X...');

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('Agent Lee X render complete');