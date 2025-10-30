/* LEEWAY HEADER
TAG: LIB.OSCONTROL.CLIENT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: monitor-smartphone
ICON_SIG: CD534113
5WH: WHAT=Typed client for MCP bridge; WHY=platform-agnostic calls;
WHO=Leeway Core; WHERE=src/lib/oscontrol/client.ts; WHEN=2025-10-28; HOW=fetch
SPDX-License-Identifier: MIT
*/
import type { AndroidApp, OSControlClient, WindowsApp } from './types';

// Resolve bridge base URL with resilience: try configured value, then nearby ports if offline.
let __cachedBridgeBase: string | null = null;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const { timeoutMs = 900, ...rest } = init || {};
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function ensureBridgeBase(): Promise<string> {
  if (__cachedBridgeBase) return __cachedBridgeBase;
  const configured: string =
    (globalThis as any).__AGENTLEE_CFG?.MCP_BRIDGE_URL ||
    (globalThis as any).AGENTLEE_CONFIG?.MCP_BRIDGE_URL ||
    'http://127.0.0.1:5176';

  const candidates: string[] = [];
  try {
    const u = new URL(configured, (globalThis as any).location?.href || 'http://127.0.0.1');
    const baseHost = `${u.protocol}//${u.hostname}`;
    const startPort = Number(u.port || '5176');
    // Try configured first, then a few adjacent ports
    candidates.push(`${baseHost}:${startPort}`);
    for (let p = startPort + 1; p <= startPort + 4; p++) candidates.push(`${baseHost}:${p}`);
  } catch {
    candidates.push(configured);
  }

  for (const base of candidates) {
    try {
      const r = await fetchWithTimeout(`${base}/healthz`, { timeoutMs: 900 });
      if (r.ok) {
        __cachedBridgeBase = base;
        try {
          // reflect into globals so other code sees the discovered port
          (globalThis as any).__AGENTLEE_CFG = Object.assign({}, (globalThis as any).__AGENTLEE_CFG || {}, { MCP_BRIDGE_URL: base });
        } catch {}
        return base;
      }
    } catch {
      // try next
    }
  }
  // Fallback to configured even if health probe failed; calls will surface errors
  __cachedBridgeBase = configured;
  return configured;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const osClient: OSControlClient = {
  async listAndroidApps() {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/apps`);
    const data = await j<{ source: string; apps: string[] }>(res);
    return data.apps.map(p => ({ package: p })) as AndroidApp[];
  },
  async launchAndroidApp(pkgOrName: string) {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/launch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkgOrName })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidTap(x: number, y: number) {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/input/tap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidType(text: string) {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/input/text`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return j<{ ok: boolean }>(res);
  },

  async listWindowsApps() {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/windows/apps`);
    const data = await j<{ source: string; apps: string[] }>(res);
    return data.apps.map(name => ({ name })) as WindowsApp[];
  },
  async launchWindowsApp(name: string) {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/windows/launch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidFindTap(text: string) {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/find-tap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async androidScreenshot() {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/android/screenshot`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async windowsScreenshot() {
    const base = await ensureBridgeBase();
    const res = await fetch(`${base}/windows/screenshot`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
};
