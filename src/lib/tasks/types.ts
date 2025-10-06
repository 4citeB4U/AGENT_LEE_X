/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.TASKS.TYPES
COLOR_ONION_HEX: CORE=#2563EB|#9333EA LAYER=#EC4899|#FBBF24
ICON_FAMILY: lucide
ICON_GLYPH: list-checks
ICON_SIG: TASK_TYPES
5WH: WHAT=Task + checklist domain types; WHY=Deterministic planner persisted to drives; WHO=Leeway Core; WHERE=src/lib/tasks/types.ts; WHEN=2025-10-05; HOW=TypeScript interfaces + enums
SPDX-License-Identifier: MIT
*/

export type TaskState = 'ready' | 'active' | 'blocked' | 'done' | 'archived';

export interface TaskStep {
  id: string;              // stable UUID-like id
  label: string;           // human-readable step label
  done: boolean;           // completion flag
  ordinal: number;         // ordering for deterministic rendering
  outcomeHint?: string;    // expected result/outcome
}

export interface TaskFileMeta {
  id: string;              // canonical file id (path-like: UI/<title>)
  title: string;           // display title
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp (mutated on any change)
  persona?: string;        // optional persona context anchor
  engineAgnostic: true;    // marker for governance compliance
}

export interface TaskRecord {
  meta: TaskFileMeta;
  state: TaskState;
  steps: TaskStep[];
  tags?: string[];
  revision: number;        // monotonic local revision (used for conflict heuristic)
  lastActor?: string;      // last user / agent id (audit)
}

export interface TaskBoardSnapshot {
  version: 1;
  updatedAt: string;
  tasks: TaskRecord[];
}

export interface TaskPersistenceAdapter {
  load(): Promise<TaskBoardSnapshot | null>;
  save(snapshot: TaskBoardSnapshot): Promise<void>;
}
