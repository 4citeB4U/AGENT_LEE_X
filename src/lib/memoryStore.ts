/* LEEWAY HEADER
TAG: CORE.MEMORY.FACADE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: book-marked
ICON_SIG: CD534113
5WH: WHAT=Memory facade over Notepad OS with event bus; WHY=Single UI integration point; WHO=Leeway Core; WHERE=src/lib/memoryStore.ts; WHEN=2025-10-06; HOW=TypeScript + simple pubsub
SPDX-License-Identifier: MIT
*/

import NotepadOS, {
    type Artifact,
    type BaseItem,
    type DriveKey,
} from './notepad/notepad-os';

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach(l => l()); }
export function subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); }

export async function init(config?: { recycleDays?: number }) {
  NotepadOS.init(config);
  emit();
}

export async function createTask(title: string, payload: { utterance?: string; meta?: Record<string, any>; tags?: string[] }, opts?: { drive?: DriveKey }) {
  const it = NotepadOS.createTask(title, { title, ...payload }, opts);
  emit();
  return it;
}

export async function update(id: string, patch: Partial<Pick<BaseItem, 'title' | 'utterance' | 'tags' | 'drive'>>) {
  const it = NotepadOS.update(id, patch);
  emit();
  return it;
}

export async function attachArtifacts(ownerId: string, artifacts: { name: string; text?: string; type?: string }[]) {
  const out = NotepadOS.attachArtifacts(ownerId, artifacts);
  emit();
  return out;
}

export async function outcome(ownerId: string, success: boolean, notes?: string, cost?: number) {
  const it = NotepadOS.outcome(ownerId, success, notes, cost);
  emit();
  return it;
}

export async function recycle(id: string) { const ok = NotepadOS.recycle(id); emit(); return ok; }
export async function restore(id: string) { const ok = NotepadOS.restore(id); emit(); return ok; }
export async function purge(id: string) { const ok = NotepadOS.purge(id); emit(); return ok; }
export async function archive(id: string) { const ok = NotepadOS.archive(id); emit(); return ok; }

export function list(filter?: { drive?: DriveKey; recycled?: boolean; includeRecycled?: boolean }) { return NotepadOS.list(filter); }
export function get(id: string) { return NotepadOS.get(id); }
export function listArtifacts(ownerId: string) { return NotepadOS.listArtifacts(ownerId); }
export function search(q: string) { return NotepadOS.search(q); }
export function setActive(id?: string) { NotepadOS.setActive(id); emit(); }
export function getActive() { return NotepadOS.getActive(); }
export function exportState() { return NotepadOS.exportState(); }

export type { Artifact, BaseItem, DriveKey };

const facade = {
  init,
  createTask,
  update,
  attachArtifacts,
  outcome,
  recycle,
  restore,
  purge,
  archive,
  list,
  get,
  listArtifacts,
  search,
  setActive,
  getActive,
  exportState,
  subscribe,
};

export default facade;
