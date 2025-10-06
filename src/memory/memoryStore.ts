/* LEEWAY HEADER
TAG: CORE.MEMORY.STORE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: database
ICON_SIG: CD534113
5WH: WHAT=Ephemeral + compressed memory store; WHY=Provide ranked retrieval context; WHO=Leeway Core (model/system agnostic); WHERE=src/memory/memoryStore.ts; WHEN=2025-10-05; HOW=TypeScript in-browser store
SPDX-License-Identifier: MIT
*/

/**
 * Memory Store Design
 * - Session Turns: recent raw exchanges (bounded FIFO)
 * - Long Notes: compressed semantic summaries with tags and recency/utility scores
 * - Retrieval: hybrid rank = weight(recency, utility, semanticMatch)
 * - Self-Learning Hook: future pipeline can adjust utility based on outcomes
 */

export interface MemoryTurn {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  ts: number; // epoch ms
}

export interface MemoryNote {
  id: string;
  summary: string;
  tags: string[];
  created: number;
  lastUsed: number;
  utility: number; // 0..1 heuristic weight
}

interface InternalState {
  turns: MemoryTurn[];
  notes: MemoryNote[];
}

const MAX_TURNS = 40; // recent working window
const MAX_NOTES = 200; // soft cap for compressed notes

const state: InternalState = {
  turns: [],
  notes: []
};

// Lightweight persistence (can be swapped for IndexedDB later)
const LS_KEY = 'agentLee.memory.v1';

function persist() {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(LS_KEY, payload);
  } catch {/* ignore quota */}
}

function hydrate() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.turns) && Array.isArray(parsed.notes)) {
        state.turns = parsed.turns.slice(-MAX_TURNS);
        state.notes = parsed.notes.slice(0, MAX_NOTES);
      }
    }
  } catch {/* ignore */}
}

hydrate();

// Utility: simple id
function uid(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function addTurn(role: MemoryTurn['role'], text: string): MemoryTurn {
  const turn: MemoryTurn = { id: uid('t'), role, text: text.trim(), ts: Date.now() };
  state.turns.push(turn);
  if (state.turns.length > MAX_TURNS) state.turns.splice(0, state.turns.length - MAX_TURNS);
  persist();
  return turn;
}

/** Create or update a compressed note (semantic summarization left to caller). */
export function upsertNote(partial: Omit<MemoryNote, 'id' | 'created' | 'lastUsed'> & { id?: string; }): MemoryNote {
  const now = Date.now();
  let note: MemoryNote | undefined;
  if (partial.id) note = state.notes.find(n => n.id === partial.id);
  if (note) {
    note.summary = partial.summary;
    note.tags = partial.tags;
    note.utility = partial.utility;
    note.lastUsed = now;
  } else {
    note = {
      id: partial.id || uid('n'),
      summary: partial.summary,
      tags: partial.tags,
      utility: partial.utility,
      created: now,
      lastUsed: now
    };
    state.notes.unshift(note);
  }
  if (state.notes.length > MAX_NOTES) state.notes.length = MAX_NOTES;
  persist();
  return note;
}

export interface RetrieveOptions {
  query?: string; // optional semantic cue
  limitTurns?: number;
  limitNotes?: number;
}

/** Basic scoring; placeholder for semantic vector matching. */
function scoreNote(note: MemoryNote, query?: string): number {
  const ageHours = (Date.now() - note.lastUsed) / 3_600_000;
  const recencyFactor = Math.exp(-ageHours / 72); // 3-day half-life-ish
  const utilityFactor = note.utility;
  let matchFactor = 0.6; // default baseline
  if (query) {
    const q = query.toLowerCase();
    if (note.summary.toLowerCase().includes(q)) matchFactor = 1.0;
    else if (note.tags.some(t => t.toLowerCase().includes(q))) matchFactor = 0.85;
    else matchFactor = 0.4;
  }
  return (recencyFactor * 0.4) + (utilityFactor * 0.4) + (matchFactor * 0.2);
}

export function retrieveContext(opts: RetrieveOptions = {}) {
  const { query, limitTurns = 10, limitNotes = 6 } = opts;
  const turns = state.turns.slice(-limitTurns);
  const rankedNotes = [...state.notes]
    .map(n => ({ note: n, s: scoreNote(n, query) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limitNotes)
    .map(r => r.note);

  // Touch lastUsed on surfaced notes
  const now = Date.now();
  rankedNotes.forEach(n => { n.lastUsed = now; });
  persist();

  return { turns, notes: rankedNotes };
}

export function exportAll() {
  return JSON.parse(JSON.stringify(state));
}

export function clearAll() {
  state.turns = [];
  state.notes = [];
  persist();
}

// Convenience summarizer placeholder
export interface SummarizeConfig { minTurns?: number; maxTurns?: number; }
export function proposeNoteFromRecent(cfg: SummarizeConfig = {}) {
  const { minTurns = 4, maxTurns = 12 } = cfg;
  const slice = state.turns.slice(-maxTurns);
  if (slice.length < minTurns) return null;
  const text = slice.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
  // Simple heuristic extraction: first sentence of each user turn
  const userSentences = slice.filter(t => t.role === 'user')
    .map(t => (t.text.split(/(?<=[.!?])\s+/)[0] || '').trim())
    .filter(Boolean)
    .slice(-5);
  const summary = `Recent focus: ${userSentences.join(' | ')}`;
  return {
    summary,
    tags: [],
    utility: 0.5
  };
}
