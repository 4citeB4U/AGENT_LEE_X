# Task Checklist UI (Leeway-Compliant)

This module provides a lightweight, model-agnostic task + step checklist UI that reads and persists a deterministic task board artifact via the existing drive abstraction (Local + Leonard + Lee).

## Components & Services

- `src/lib/tasks/types.ts` — Domain types (`TaskRecord`, `TaskStep`, `TaskBoardSnapshot`).
- `src/lib/tasks/taskService.ts` — In‑memory board cache + persistence + Autosave snapshot emission.
- `src/components/TaskChecklist.tsx` — Accessible React UI (list + steps + progress bar + state toggles).

## Storage / Persistence

The task board is stored under the Local drive namespace using key:
```
 drive:agentlee/tasks/board.json
```
Each mutation:
1. Updates in‑memory snapshot.
2. Persists JSON through `LocalAdapter.write` (path hint above).
3. Emits an Autosave snapshot (`kind: settings`, id: `tasks-board`).
4. (Future) Will sync to Leonard / Lee drives automatically when their adapters are fully implemented.

## Embedding the UI

Minimal usage inside any React view:
```tsx
import TaskChecklist from './src/components/TaskChecklist';

export function TasksPanel() {
  return (
    <div className="p-4">
      <TaskChecklist onTaskOpen={(task) => console.log('Opened task', task.meta.id)} />
    </div>
  );
}
```
You can also filter by tag:
```tsx
<TaskChecklist filterTag="release" />
```

## Creating / Seeding Tasks
Currently tasks are created programmatically via the `TaskService.upsert` API. Example seeding script (run once inside a component `useEffect` or a dev-only initializer):
```tsx
import { TaskService } from './src/lib/tasks/taskService';

function seed() {
  const existing = TaskService.get('ui.checklist.demo');
  if (existing) return;
  TaskService.upsert({
    meta: {
      id: 'ui.checklist.demo',
      title: 'UI — Checklist Demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      persona: 'Agent Lee',
      engineAgnostic: true
    },
    state: 'active',
    steps: [
      { id: 's1', label: 'Render list', done: true, ordinal: 1 },
      { id: 's2', label: 'Toggle steps', done: false, ordinal: 2 },
      { id: 's3', label: 'Persist board', done: false, ordinal: 3 }
    ],
    revision: 0,
    tags: ['release','ui']
  });
}
```

## Accessibility Notes
- Each task list item exposes a `role="button"` wrapper (keyboard: Enter / Space).
- Step toggles use native checkboxes (screen-reader friendly) without custom ARIA hacks.
- Progress bar is visually represented; for future enhancement add `aria-valuenow` using `role="progressbar"` if needed.

## Governance + Determinism
- Snapshot writes are versioned (monotonic `revision`) — deterministic JSON ordering maintained by sorted tasks + step ordinals.
- All files contain canonical LEEWAY headers.
- Autosave pipeline already integrates via `Autosave.snapshot` ensuring offline durability.

## Planned Enhancements (Optional)
- Artifact-per-task mode (instead of single board file) for extremely large boards.
- Drive sync conflict heuristic (pick highest `revision` + merge undone steps).
- Import/export as signed bundle (hash chain for audit integrity).
- Inline step add UI.
- Tag filter chips + search box.

## Integrating Into Main App Shell
If you want this as a selectable feature tab:
1. Add a new `feature` key (e.g., `tasks`) to your feature union.
2. Conditionally render `<TaskChecklist />` inside the main panel when `activeFeature === 'tasks'`.
3. (Optional) Provide a seeding routine on first load (no tasks present).

## Security / Trust Surface
- Local-only for now (no remote POST in adapters for tasks JSON yet).
- When remote adapters are enabled, ensure Worker proxy enforces auth + schema validation (version=1 guard + whitelist fields).

## License
MIT (per SPDX in headers).
