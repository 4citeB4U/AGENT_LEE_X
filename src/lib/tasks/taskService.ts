/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.TASKS.SERVICE
COLOR_ONION_HEX: CORE=#2563EB|#9333EA LAYER=#EC4899|#FBBF24
ICON_FAMILY: lucide
ICON_GLYPH: workflow
ICON_SIG: TASK_SERVICE
5WH: WHAT=Task board CRUD + persistence service; WHY=Central API for checklist UI; WHO=Leeway Core; WHERE=src/lib/tasks/taskService.ts; WHEN=2025-10-05; HOW=In-memory cache + LocalAdapter + Autosave hooks
SPDX-License-Identifier: MIT
*/

import { Autosave, buildSnapshot } from '../storage/autosave';
import { LeeRemote, LeonardRemote, LocalAdapter } from '../storage/driveAdapters';
import { loadWorkingDeltas, reconcileDeltas } from './conflict';
import type { TaskBoardSnapshot, TaskRecord, TaskStep } from './types';

// Logical multi-drive path helpers
const paths = {
  board: (id: string) => `A:/tasks/Plan — ${id}.json`,
  working: (id: string, ts: string) => `R:/tasks/updates/${id}/${ts}.json`,
  ui: (id: string) => `L:/ui/TaskChecklist/${id}.json`,
  registry: (id: string) => `LEE:/registry/tasks/${id}.json`,
  last: 'LEE:/registry/tasks/_lastActive.json',
  log: (id: string, ts: string) => `D:/logs/tasks/${id}/${ts}.json`
};

let cache: TaskBoardSnapshot | null = null;
const nowISO = () => new Date().toISOString();

function ensure(): TaskBoardSnapshot {
  if (!cache) cache = { version: 1, updatedAt: nowISO(), tasks: [] };
  return cache;
}

function writeAll() {
  if (!cache) return;
  cache.updatedAt = nowISO();
  const ts = cache.updatedAt;
  const fanout = async (writes: { id: string; json: any; path: string }[]) => {
    // Local first (synchronous-ish) then fire-and-forget remotes
    writes.forEach(w => LocalAdapter.write({ id: w.id, json: w.json, blob: null, pathHint: w.path }));
    // Remote propagation (non-blocking)
    queueMicrotask(() => {
      writes.forEach(w => {
        LeonardRemote.write(w.path, w.json).catch(()=>{});
        LeeRemote.write(w.path, w.json).catch(()=>{});
      });
    });
  };

  const flat = cache.tasks.map(t => ({ id: t.meta.id, rev: t.revision, steps: t.steps.map(s => ({ id: s.id, d: s.done })) }));
  const writes = [
    { id: 'tasks-plan', json: cache, path: paths.board('board') },
    { id: 'tasks-ui', json: { kind: 'ui_hint', planId: 'board', at: ts }, path: paths.ui('board') },
    { id: 'tasks-reg', json: { planId: 'board', updatedAt: ts }, path: paths.registry('board') },
    { id: 'tasks-last', json: { id: 'board', at: ts }, path: paths.last },
    { id: `tasks-work-${ts}`, json: flat, path: paths.working('board', ts) },
    { id: `tasks-log-${ts}`, json: { event: 'board_write', at: ts, count: cache.tasks.length }, path: paths.log('board', ts) }
  ];
  fanout(writes);
  // Autosave snapshot
  Autosave.snapshot(buildSnapshot('settings', 'tasks-board', 'tasks', cache));
}

export const TaskService = {
  load(): TaskBoardSnapshot {
    if (cache) return cache;
    // Attempt to read authoritative board
    const raw = localStorage.getItem(`drive:${paths.board('board')}`);
    if (raw) {
      try { cache = JSON.parse(raw) as TaskBoardSnapshot; } catch { /* ignore */ }
    }
    // Conflict reconciliation pass (R-drive deltas)
    const deltas = loadWorkingDeltas();
    if (!cache) cache = { version: 1, updatedAt: nowISO(), tasks: [] };
    if (deltas.length) {
      const res = reconcileDeltas(cache, deltas);
      if (res.merged) {
        // Write a merge log artifact
        const ts = nowISO();
        LocalAdapter.write({ id: `tasks-merge-${ts}`, json: { event: 'merge', applied: res.applied, reasons: res.reasons, at: ts }, blob: null, pathHint: paths.log('board', ts) });
      }
    }
    return ensure();
  },
  list(): TaskRecord[] { return this.load().tasks; },
  get(id: string): TaskRecord | undefined { return this.load().tasks.find(t => t.meta.id === id); },
  upsert(task: Omit<TaskRecord,'revision'> & { revision?: number }) {
    const b = this.load();
    const idx = b.tasks.findIndex(t => t.meta.id === task.meta.id);
    const baseRev = idx >= 0 ? b.tasks[idx].revision : 0;
    const next: TaskRecord = { ...task, revision: baseRev + 1 } as TaskRecord;
    if (idx >= 0) b.tasks[idx] = next; else b.tasks.push(next);
    writeAll();
    return next;
  },
  toggleStep(taskId: string, stepId: string) {
    const t = this.get(taskId); if (!t) return;
    const s = t.steps.find(s => s.id === stepId); if (!s) return;
    s.done = !s.done;
    t.revision += 1; t.meta.updatedAt = nowISO();
    writeAll();
  },
  addStep(taskId: string, step: TaskStep) {
    const t = this.get(taskId); if (!t) return;
    t.steps.push(step); t.steps.sort((a,b)=>a.ordinal-b.ordinal);
    t.revision += 1; t.meta.updatedAt = nowISO();
    writeAll();
  },
  removeStep(taskId: string, stepId: string) {
    const t = this.get(taskId); if (!t) return;
    const before = t.steps.length;
    t.steps = t.steps.filter(s => s.id !== stepId);
    if (t.steps.length !== before) {
      t.revision += 1; t.meta.updatedAt = nowISO();
      writeAll();
    }
  },
  setState(taskId: string, state: TaskRecord['state']) {
    const t = this.get(taskId); if (!t) return;
    t.state = state; t.revision += 1; t.meta.updatedAt = nowISO();
    writeAll();
  }
};
