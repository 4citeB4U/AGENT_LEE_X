/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.STORAGE.ADAPTERS
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: cloud-upload
ICON_SIG: STORAGE_ADAPTERS
5WH: WHAT=Pluggable drive adapters (local/leonard/lee); WHY=Sync snapshots anywhere; WHO=Leeway Core; WHERE=src/lib/storage/driveAdapters.ts; WHEN=2025-10-05; HOW=Adapter pattern + Worker proxy stubs
SPDX-License-Identifier: MIT
*/

import type { DriveAdapter, DriveWrite } from './types';

// Remote adapter lightweight interface (fire-and-forget)
export interface RemoteAdapter { write(path: string, body: unknown): Promise<void>; read?(path: string): Promise<unknown | null>; }

export const LeonardRemote: RemoteAdapter = {
  async write(path, body) {
    try { await fetch('/api/leonard/write', { method: 'POST', headers: { 'content-type':'application/json'}, body: JSON.stringify({ path, body }) }); }
    catch { /* swallow */ }
  },
  async read(_path) { return null; }
};

export const LeeRemote: RemoteAdapter = {
  async write(path, body) {
    try { await fetch('/api/lee/write', { method: 'POST', headers: { 'content-type':'application/json'}, body: JSON.stringify({ path, body }) }); }
    catch { /* swallow */ }
  },
  async read(_path) { return null; }
};

const safeFetch = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
};

export const LocalAdapter: DriveAdapter = {
  name: 'local',
  async write(item: DriveWrite) {
    try {
      const key = item.pathHint ?? `local/${item.id}`;
      const json = item.json ?? { empty: true };
      localStorage.setItem(`drive:${key}` , JSON.stringify(json));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'local write failed' };
    }
  },
  async read(id: string) {
    try {
      const raw = localStorage.getItem(`drive:${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

declare global { interface Window { AGENTLEE_CONFIG?: { GEMINI_PROXY_URL?: string } } }

const postWorkerJSON = async (endpoint: string, body: any) => {
  const base = window.AGENTLEE_CONFIG?.GEMINI_PROXY_URL || '';
  if (!base) throw new Error('Missing Worker proxy URL (GEMINI_PROXY_URL).');
  const url = `${base.replace(/\/+$/,'')}/sync/${endpoint.replace(/^\/+/,'')}`;
  await safeFetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
};

export const LeonardDriveAdapter: DriveAdapter = {
  name: 'leonard',
  async write(item: DriveWrite) {
    try { await postWorkerJSON('leonard', { id: item.id, path: item.pathHint, json: item.json }); return { ok: true }; }
    catch (e: any) { return { ok: false, error: e?.message || 'leonard write failed' }; }
  }
};

export const LeeDriveAdapter: DriveAdapter = {
  name: 'lee',
  async write(item: DriveWrite) {
    try { await postWorkerJSON('lee', { id: item.id, path: item.pathHint, json: item.json }); return { ok: true }; }
    catch (e: any) { return { ok: false, error: e?.message || 'lee write failed' }; }
  }
};
