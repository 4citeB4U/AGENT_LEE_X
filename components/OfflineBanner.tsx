import React, { useCallback, useEffect, useRef, useState } from 'react';

// Lightweight connectivity banner that informs the user when the app is offline
// or when the page cannot be reached (network/server error). Designed to be
// framework-agnostic and safe to include anywhere in the React tree.

const PING_URL = 'manifest.webmanifest'; // small static file to probe
const PING_INTERVAL_MS = 10000; // 10s
const PING_TIMEOUT_MS = 4000; // 4s

function useConnectivity() {
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [unreachable, setUnreachable] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());

  const controllerRef = useRef<AbortController | null>(null);

  const ping = useCallback(async () => {
    setLastChecked(Date.now());
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      setIsOffline(true);
      setUnreachable(false);
      return;
    }
    setIsOffline(false);
    try {
      if (controllerRef.current) controllerRef.current.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      const id = window.setTimeout(() => ctrl.abort('timeout'), PING_TIMEOUT_MS);
      const res = await fetch(PING_URL, { method: 'GET', cache: 'no-store', signal: ctrl.signal });
      window.clearTimeout(id);
      setUnreachable(!(res.ok));
    } catch {
      setUnreachable(true);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOffline(false); void ping(); };
    const onOffline = () => { setIsOffline(true); setUnreachable(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // initial check
    void ping();
    const id = window.setInterval(() => void ping(), PING_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(id);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [ping]);

  return { isOffline, unreachable, lastChecked, ping } as const;
}

const OfflineBanner: React.FC = () => {
  const { isOffline, unreachable, lastChecked, ping } = useConnectivity();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!isOffline && !unreachable) return null;

  const message = isOffline
    ? 'You are offline. Check your internet connection.'
    : 'Page cannot be reached. The development server may be down.';

  const detail = new Date(lastChecked).toLocaleTimeString();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] sm:max-w-xl p-3 rounded-xl border bg-black/70 backdrop-blur text-white border-white/20 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="inline-block w-2.5 h-2.5 mt-1 rounded-full bg-red-400" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{message}</p>
          <p className="text-xs opacity-80">Last check: {detail}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => ping()} className="px-2 py-1 text-xs rounded-lg border border-white/20 hover:border-white/40" aria-label="Retry connectivity check">Retry</button>
            <button onClick={() => location.reload()} className="px-2 py-1 text-xs rounded-lg border border-white/20 hover:border-white/40" aria-label="Reload the page">Reload</button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss connectivity banner" className="px-2 py-1 text-xs rounded-lg border border-white/20 hover:border-white/40">Dismiss</button>
      </div>
    </div>
  );
};

export default OfflineBanner;
