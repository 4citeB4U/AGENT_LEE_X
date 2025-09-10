"use client";
import { useEffect } from 'react';
import { warmKokoro } from '@/lib/kokoro-tts';

export default function KokoroWarm() {
  useEffect(() => {
    // Warm on idle
    let id: number | undefined;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(async () => {
        try { await warmKokoro(); } catch {}
      });
    } else {
      id = (globalThis as any).setTimeout(() => { warmKokoro().catch(()=>{}); }, 2000) as number;
    }
    return () => { if (id !== undefined) { window.clearTimeout(id); } };
  }, []);
  return null;
}
