"use client";

import { useEffect, useState } from 'react';

export default function CoepStatusBadge() {
  const [isolated, setIsolated] = useState<boolean | null>(null);
  const [sab, setSab] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setIsolated((globalThis as any).crossOriginIsolated === true);
      // Quick SAB probe
      let ok = false;
      try {
        // @ts-ignore
        const buf = new SharedArrayBuffer(8);
        ok = !!buf;
      } catch {}
      setSab(ok);
    } catch {
      setIsolated(false);
      setSab(false);
    }
  }, []);

  const pill = (label: string, on?: boolean | null) => (
    <span className={`px-2 py-0.5 rounded-full text-xs border
      ${on === null ? 'bg-gray-200 text-gray-700 border-gray-300'
        : on ? 'bg-green-100 text-green-700 border-green-300'
        : 'bg-red-100 text-red-700 border-red-300'}`}>
      {label}: {on === null ? '…' : on ? 'on' : 'off'}
    </span>
  );

  return (
    <div className="fixed bottom-3 right-3 z-50 bg-white/80 backdrop-blur border border-gray-200 rounded-lg px-3 py-2 shadow">
      <div className="text-xs font-semibold mb-1">COOP/COEP</div>
      <div className="flex gap-2">
        {pill('isolated', isolated)}
        {pill('SAB', sab)}
      </div>
    </div>
  );
}
