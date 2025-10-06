/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.STORAGE.AUTOSAVE
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: save-all
ICON_SIG: STORAGE_AUTOSAVE
5WH: WHAT=Autosave + offline queue + flush; WHY=No lost work + multi-drive sync; WHO=Leeway Core; WHERE=src/lib/storage/autosave.ts; WHEN=2025-10-05; HOW=LocalStorage queue + adapters + network hooks
SPDX-License-Identifier: MIT
*/

import { LeeDriveAdapter, LeonardDriveAdapter, LocalAdapter } from './driveAdapters';
import type { DriveAdapter, SavedPayload } from './types';

const DB_KEY = 'agentlee.autosave.queue.v1';
const SNAP_KEY = 'agentlee.autosave.snap.v1';

interface QueueItem { id: string; tries: number; payload: SavedPayload }

const readJSON = <T>(k: string): T | null => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : null; } catch { return null; } };
const writeJSON = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* ignore quota */} };

const debounce = (fn: () => void, ms: number) => {
  let t: number | undefined; return () => { window.clearTimeout(t); t = window.setTimeout(fn, ms) as unknown as number; };
};

const adapters: DriveAdapter[] = [LocalAdapter, LeonardDriveAdapter, LeeDriveAdapter];

async function flushOne(item: QueueItem): Promise<boolean> {
  const write = { id: item.payload.id, json: item.payload, blob: null, pathHint: `agentlee/snapshots/${item.payload.kind}/${item.payload.id}.json` };
  for (const a of adapters) { const res = await a.write(write); if (!res.ok) return false; }
  return true;
}

export const Autosave = {
  snapshot(payload: SavedPayload) {
    writeJSON(SNAP_KEY, payload);
    const q = readJSON<QueueItem[]>(DB_KEY) ?? [];
    q.push({ id: `${payload.kind}:${payload.id}:${payload.version}`, tries: 0, payload });
    writeJSON(DB_KEY, q);
    console.debug('[Autosave] snapshot', payload);
  },
  restore(): SavedPayload | null { return readJSON<SavedPayload>(SNAP_KEY); },
  async flushAll(maxPerTick = 4) {
    let q = readJSON<QueueItem[]>(DB_KEY) ?? [];
    const next: QueueItem[] = []; let processed = 0;
    for (const item of q) {
      if (processed >= maxPerTick) { next.push(item); continue; }
      try { const ok = await flushOne(item); if (!ok) throw new Error('adapter failed'); }
      catch { next.push({ ...item, tries: item.tries + 1 }); }
      processed++;
    }
    writeJSON(DB_KEY, next);
    return { queued: next.length };
  },
  attachNetworkListener() {
    const run = debounce(() => Autosave.flushAll(), 600);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && navigator.onLine) run(); });
  }
};

export function buildSnapshot(kind: 'result' | 'note' | 'settings', id: string, feature: string | undefined, content: unknown): SavedPayload {
  return { kind, id, feature, content, version: Date.now(), updatedAt: new Date().toISOString() };
}
