import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives a visible countdown that mirrors your flush window.
 * onFlush should perform conversation flush + snapshot; we restart after.
 */
export function useConversationAutosave(opts: {
  windowMs?: number;            // default 60000
  onFlush: () => Promise<void>; // wire to flushConversationTurns
}) {
  const windowMs = opts.windowMs ?? 60000;
  const [remainingMs, setRemainingMs] = useState(windowMs);
  const [isFlushing, setIsFlushing] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setRemainingMs(windowMs);
    startRef.current = performance.now();
  }, [windowMs]);

  const tick = useCallback((t: number) => {
    if (startRef.current == null) startRef.current = t;
    const elapsed = t - startRef.current;
    const left = Math.max(0, windowMs - elapsed);
    setRemainingMs(left);
    if (left <= 0) return; // wait for flush cycle to restart
    rafRef.current = requestAnimationFrame(tick);
  }, [windowMs]);

  const start = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    reset();
    rafRef.current = requestAnimationFrame(tick);
  }, [reset, tick]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => { start(); return () => stop(); }, [start, stop]);

  const manualSave = useCallback(async () => {
    setIsFlushing(true);
    try { await opts.onFlush(); } finally {
      setIsFlushing(false);
      start();
    }
  }, [opts, start]);

  // auto flush when timer hits zero
  useEffect(() => {
    if (remainingMs <= 0 && !isFlushing) { (async () => { await manualSave(); })(); }
  }, [remainingMs, isFlushing, manualSave]);

  const pct = 100 - Math.round((remainingMs / windowMs) * 100);

  return { remainingMs, percentElapsed: pct, isFlushing, resetWindow: reset, manualSave };
}
