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

const BRIDGE: string =
  (globalThis as any).__AGENTLEE_CFG?.MCP_BRIDGE_URL ||
  (globalThis as any).AGENTLEE_CONFIG?.MCP_BRIDGE_URL ||
  'http://127.0.0.1:5176';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const osClient: OSControlClient = {
  async listAndroidApps() {
    const res = await fetch(`${BRIDGE}/android/apps`);
    const data = await j<{ source: string; apps: string[] }>(res);
    return data.apps.map(p => ({ package: p })) as AndroidApp[];
  },
  async launchAndroidApp(pkgOrName: string) {
    const res = await fetch(`${BRIDGE}/android/launch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkgOrName })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidTap(x: number, y: number) {
    const res = await fetch(`${BRIDGE}/android/input/tap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidType(text: string) {
    const res = await fetch(`${BRIDGE}/android/input/text`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return j<{ ok: boolean }>(res);
  },

  async listWindowsApps() {
    const res = await fetch(`${BRIDGE}/windows/apps`);
    const data = await j<{ source: string; apps: string[] }>(res);
    return data.apps.map(name => ({ name })) as WindowsApp[];
  },
  async launchWindowsApp(name: string) {
    const res = await fetch(`${BRIDGE}/windows/launch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return j<{ ok: boolean }>(res);
  },
  async androidFindTap(text: string) {
    const res = await fetch(`${BRIDGE}/android/find-tap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async androidScreenshot() {
    const res = await fetch(`${BRIDGE}/android/screenshot`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async windowsScreenshot() {
    const res = await fetch(`${BRIDGE}/windows/screenshot`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
};
