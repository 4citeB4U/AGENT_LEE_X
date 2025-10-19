/* LEEWAY HEADER
TAG: CORE.NOTEPAD.OS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: hard-drive
ICON_SIG: CD534113
5WH: WHAT=Notepad OS core (drives, journal, retention, index, archive); WHY=Single source of truth for app memory; WHO=Leeway Core; WHERE=src/lib/notepad/notepad-os.ts; WHEN=2025-10-06; HOW=TypeScript in-browser store w/ localStorage
SPDX-License-Identifier: MIT
*/

import { clampArtifacts, clampTaskPayload, type ClampedArtifact, type TaskPayloadIn } from './schema-clamp';

export type DriveKey = 'R' | 'A' | 'L' | 'LEE' | 'D' | 'E' | 'O' | 'N';

export interface BaseItem {
  id: string;
  drive: DriveKey;
  title: string;
  utterance?: string;
  tags: string[];
  created: number;
  updated: number;
  recycledAt?: number; // if in recycle bin
  archivedAt?: number; // if archived
  outcome?: { success: boolean; notes?: string; cost?: number; at: number };
}

export interface Artifact extends ClampedArtifact {
  id: string;
  ownerId: string;
  created: number;
}

export interface JournalEntry {
  id: string;
  ownerId: string;
  ts: number;
  type: 'create' | 'update' | 'artifact' | 'archive' | 'recycle' | 'restore' | 'purge' | 'outcome';
  notes?: string;
}

interface State {
  items: Record<string, BaseItem>;
  artifacts: Record<string, Artifact[]>; // by ownerId
  index: Record<string, string[]>; // term -> ids
  journal: JournalEntry[];
  activeId?: string;
  cfg: { recycleDays: number };
}

const LS_KEY = 'agentLee.notepadOS.v1';

const state: State = {
  items: {},
  artifacts: {},
  index: {},
  journal: [],
  cfg: { recycleDays: 7 },
};

function uid(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function persist() {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(LS_KEY, payload);
  } catch {/* ignore */}
}

function hydrate() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && typeof parsed === 'object') {
        Object.assign(state, parsed);
      }
    }
  } catch {/* ignore */}
}

hydrate();

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 64);
}

function indexItem(item: BaseItem) {
  const terms = new Set<string>([...tokenize(item.title), ...tokenize(item.utterance || ''), ...item.tags.map(t => t.toLowerCase())]);
  // remove existing refs
  for (const [term, ids] of Object.entries(state.index)) {
    const i = ids.indexOf(item.id);
    if (i !== -1) ids.splice(i, 1);
    if (ids.length === 0) delete state.index[term];
  }
  // add new refs
  for (const t of terms) {
    if (!state.index[t]) state.index[t] = [];
    if (!state.index[t].includes(item.id)) state.index[t].push(item.id);
  }
}

function journal(ownerId: string, type: JournalEntry['type'], notes?: string) {
  state.journal.push({ id: uid('j'), ownerId, ts: Date.now(), type, notes });
}

function ensureArray<T>(dict: Record<string, T[]>, key: string) {
  if (!dict[key]) dict[key] = [];
  return dict[key];
}

let retentionTimer: number | undefined;

function scheduleRetentionSweep() {
  if (retentionTimer) window.clearTimeout(retentionTimer);
  // Run every ~6 minutes as a default, adjustable later
  retentionTimer = window.setTimeout(() => {
    const now = Date.now();
    const ms = state.cfg.recycleDays * 24 * 60 * 60 * 1000;
    for (const it of Object.values(state.items)) {
      if (it.recycledAt && now - it.recycledAt > ms) {
        purge(it.id);
      }
    }
    scheduleRetentionSweep();
  }, 360_000);
}

export function init(config?: { recycleDays?: number }) {
  if (config?.recycleDays && config.recycleDays > 0) state.cfg.recycleDays = config.recycleDays;
  scheduleRetentionSweep();
  persist();
}

export function createTask(title: string, payload: TaskPayloadIn, opts?: { drive?: DriveKey }) {
  const c = clampTaskPayload({
    title,
    utterance: payload.utterance,
    meta: payload.meta,
    tags: payload.tags,
  });
  const id = uid('note');
  const item: BaseItem = {
    id,
    drive: opts?.drive || 'R',
    title: c.title,
    utterance: c.utterance,
    tags: c.tags,
    created: Date.now(),
    updated: Date.now(),
  };
  state.items[id] = item;
  indexItem(item);
  journal(id, 'create');
  state.activeId = id;
  persist();
  return item;
}

export function update(id: string, patch: Partial<Pick<BaseItem, 'title' | 'utterance' | 'tags' | 'drive'>>) {
  const it = state.items[id];
  if (!it) return undefined;
  if (patch.title !== undefined) it.title = String(patch.title);
  if (patch.utterance !== undefined) it.utterance = patch.utterance;
  if (patch.tags !== undefined) it.tags = patch.tags.filter(Boolean);
  if (patch.drive !== undefined) it.drive = patch.drive;
  it.updated = Date.now();
  indexItem(it);
  journal(id, 'update');
  persist();
  return it;
}

export function attachArtifacts(ownerId: string, artifacts: { name: string; text?: string; type?: string }[]) {
  const it = state.items[ownerId];
  if (!it) return [] as Artifact[];
  const clamped = clampArtifacts(artifacts);
  const arr = ensureArray(state.artifacts, ownerId);
  const out: Artifact[] = [];
  for (const a of clamped) {
    const art: Artifact = { id: uid('art'), ownerId, created: Date.now(), ...a };
    arr.push(art);
    out.push(art);
  }
  journal(ownerId, 'artifact');
  persist();
  return out;
}

export function outcome(ownerId: string, success: boolean, notes?: string, cost?: number) {
  const it = state.items[ownerId];
  if (!it) return undefined;
  it.outcome = { success, notes, cost, at: Date.now() };
  journal(ownerId, 'outcome');
  persist();
  return it;
}

export function recycle(id: string) {
  const it = state.items[id];
  if (!it || it.recycledAt) return false;
  it.recycledAt = Date.now();
  journal(id, 'recycle');
  persist();
  return true;
}

export function restore(id: string) {
  const it = state.items[id];
  if (!it || !it.recycledAt) return false;
  it.recycledAt = undefined;
  journal(id, 'restore');
  persist();
  return true;
}

export function purge(id: string) {
  const it = state.items[id];
  if (!it) return false;
  delete state.items[id];
  delete state.artifacts[id];
  for (const [term, ids] of Object.entries(state.index)) {
    state.index[term] = ids.filter(x => x !== id);
    if (state.index[term].length === 0) delete state.index[term];
  }
  journal(id, 'purge');
  persist();
  return true;
}

export function archive(id: string) {
  const it = state.items[id];
  if (!it || it.archivedAt) return false;
  it.archivedAt = Date.now();
  it.drive = 'N'; // registry archive pointer bucket
  journal(id, 'archive');
  persist();
  return true;
}

export function setActive(id?: string) {
  state.activeId = id;
  persist();
}

export function getActive() {
  return state.activeId ? state.items[state.activeId] : undefined;
}

export function list(filter?: { drive?: DriveKey; recycled?: boolean; includeRecycled?: boolean }) {
  const items = Object.values(state.items);
  return items.filter(it => {
    if (filter?.drive && it.drive !== filter.drive) return false;
    if (filter?.recycled === true && !it.recycledAt) return false;
    if (filter?.includeRecycled !== true && it.recycledAt) return false;
    return true;
  }).sort((a, b) => (b.updated - a.updated));
}

export function get(id: string) {
  return state.items[id];
}

export function listArtifacts(ownerId: string) {
  return (state.artifacts[ownerId] || []).slice().sort((a, b) => a.created - b.created);
}

export function search(q: string) {
  const terms = tokenize(q);
  const idSet = new Set<string>();
  for (const t of terms) {
    const ids = state.index[t];
    if (ids) ids.forEach(id => idSet.add(id));
  }
  const items = Array.from(idSet).map(id => state.items[id]).filter(Boolean) as BaseItem[];
  // naive rank: updated recency + tag/term overlap count
  const scores = new Map<string, number>();
  for (const it of items) {
    const overlap = it.tags.map(t => t.toLowerCase()).filter(t => terms.includes(t)).length;
    const rec = (Date.now() - it.updated) / 86_400_000; // days
    const recencyScore = Math.exp(-rec / 7);
    scores.set(it.id, overlap + recencyScore);
  }
  return items.sort((a, b) => (scores.get(b.id)! - scores.get(a.id)!));
}

export function exportState() {
  return JSON.parse(JSON.stringify(state));
}

export default {
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
};
