/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.TASKS.CONFLICT
COLOR_ONION_HEX: CORE=#0EA5E9|#6366F1 LAYER=#F59E0B|#F87171
ICON_FAMILY: lucide
ICON_GLYPH: merge
ICON_SIG: TASK_CONFLICT_MERGE
5WH: WHAT=Lightweight R-drive delta reconciliation; WHY=Reduce lost step toggles across remotes; WHO=Leeway Core; WHERE=src/lib/tasks/conflict.ts; WHEN=2025-10-05; HOW=Heuristic merge (highest revision + last toggle wins)
SPDX-License-Identifier: MIT
*/

import type { TaskBoardSnapshot, TaskRecord } from './types';

interface DeltaEntry { id: string; rev: number; steps: { id: string; d: boolean }[] }

interface MergeResult { merged: boolean; applied: number; reasons: string[] }

// Very small heuristic: if a delta rev > current rev, or same rev but step done state differs, apply step states and bump revision.
export function reconcileDeltas(board: TaskBoardSnapshot, deltas: DeltaEntry[]): MergeResult {
  const reasons: string[] = [];
  let applied = 0; let merged = false;
  const map: Record<string, TaskRecord> = Object.fromEntries(board.tasks.map(t => [t.meta.id, t]));
  for (const d of deltas) {
    const task = map[d.id]; if (!task) { reasons.push(`skip:${d.id}:missing`); continue; }
    if (d.rev < task.revision) { reasons.push(`skip:${d.id}:older`); continue; }
    let changed = false;
    for (const st of d.steps) {
      const local = task.steps.find(s => s.id === st.id); if (!local) { reasons.push(`skip_step:${d.id}:${st.id}`); continue; }
      if (local.done !== st.d) { local.done = st.d; changed = true; }
    }
    if (changed) {
      task.revision = Math.max(task.revision, d.rev) + 1; // bump beyond remote rev to indicate local merge
      task.meta.updatedAt = new Date().toISOString();
      merged = true; applied += 1;
    }
  }
  return { merged, applied, reasons };
}

// Utility to scan localStorage for R-drive delta artifacts (paths.working). This avoids adding a read API to adapters for now.
export function loadWorkingDeltas(prefix = 'drive:R:/tasks/updates/'): DeltaEntry[] {
  const out: DeltaEntry[] = [];
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i); if (!k || !k.startsWith('drive:R:/tasks/updates/')) continue;
    const raw = localStorage.getItem(k); if (!raw) continue;
    try {
      const arr = JSON.parse(raw) as DeltaEntry[] | any;
      if (Array.isArray(arr) && arr.length && arr[0].id && Array.isArray(arr[0].steps)) {
        // Treat all entries as a batch; push individually
        for (const d of arr) {
          if (d && typeof d.id === 'string' && Array.isArray(d.steps)) out.push(d as DeltaEntry);
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}
