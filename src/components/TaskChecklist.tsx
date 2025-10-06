/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: FRONTEND.UI.TASK_CHECKLIST
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: check-square
ICON_SIG: TASK_CHECKLIST_UI
5WH: WHAT=Interactive task checklist viewer; WHY=Live progress tracking from Drive artifact; WHO=Leeway Core (agnostic); WHERE=src/components/TaskChecklist.tsx; WHEN=2025-10-05; HOW=React 19 + TaskService + accessible list semantics
SPDX-License-Identifier: MIT
*/

import React, { useEffect, useState } from 'react';
import { TaskService } from '../lib/tasks/taskService';
import type { TaskRecord } from '../lib/tasks/types';

interface TaskChecklistProps {
  filterTag?: string;
  className?: string;
  onTaskOpen?: (task: TaskRecord) => void;
}

export const TaskChecklist: React.FC<TaskChecklistProps> = ({ filterTag, className = '', onTaskOpen }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newStepLabel, setNewStepLabel] = useState('');

  useEffect(() => {
    const board = TaskService.load();
    setTasks(board.tasks.slice().sort((a,b)=>a.meta.title.localeCompare(b.meta.title)));
  }, []);

  const refresh = () => {
    setTasks(TaskService.list().slice().sort((a,b)=>a.meta.title.localeCompare(b.meta.title)));
  };

  const visible = tasks.filter(t => !filterTag || t.tags?.includes(filterTag));
  const selected = visible.find(t => t.meta.id === selectedTaskId) || null;

  return (
    <div className={`task-checklist space-y-4 ${className}`}> 
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-3">Tasks <span className="text-xs font-normal opacity-70">{visible.length}</span>
          {(() => {
            const allSteps = visible.flatMap(t => t.steps);
            const done = allSteps.filter(s => s.done).length;
            const total = Math.max(1, allSteps.length);
            const pct = Math.round(done / total * 100);
            return (
              <span className="text-[10px] px-2 py-1 rounded bg-gray-800 border border-gray-700 tracking-wide" aria-label={`Overall task progress ${pct} percent`}>
                {done}/{total} ({pct}%)
              </span>
            );
          })()}
        </h2>
        <ul aria-label="Task list" className="divide-y divide-gray-700 border border-gray-700 rounded-md overflow-hidden">
          {visible.map(t => {
            const progress = t.steps.length ? Math.round(t.steps.filter(s=>s.done).length / t.steps.length * 100) : 0;
            return (
              <li key={t.meta.id} data-selected={selectedTaskId===t.meta.id || undefined}>
                <div
                  role="button"
                  tabIndex={0}
                  {...(selectedTaskId===t.meta.id ? { 'aria-pressed': 'true' } : {})}
                  className={`w-full cursor-pointer text-left px-3 py-2 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39FF14] ${selectedTaskId===t.meta.id ? 'bg-gray-800' : ''}`}
                  onClick={() => { setSelectedTaskId(t.meta.id); onTaskOpen?.(t); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTaskId(t.meta.id); onTaskOpen?.(t); } }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.meta.title}</span>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>
                  <div className="progress-track mt-2" aria-hidden="true">
                    <div className="progress-bar" data-pct={progress} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <div className="task-detail border border-gray-700 rounded-md p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-base">{selected.meta.title}</h3>
              <p className="text-xs text-gray-400 mt-1">State: {selected.state} • Rev {selected.revision}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="text-xs border border-gray-600 px-2 py-1 rounded hover:bg-gray-800"
                onClick={() => { TaskService.setState(selected.meta.id, selected.state === 'done' ? 'active' : 'done'); refresh(); }}
              >{selected.state === 'done' ? 'Reopen' : 'Mark Done'}</button>
              <button
                className="text-xs border border-gray-600 px-2 py-1 rounded hover:bg-gray-800"
                onClick={() => { TaskService.setState(selected.meta.id, 'archived'); refresh(); }}
              >Archive</button>
            </div>
          </div>
          <ul className="space-y-2" aria-label="Task steps">
            {selected.steps.sort((a,b)=>a.ordinal-b.ordinal).map(s => (
              <li key={s.id} className="flex items-start gap-2 group">
                <label className="inline-flex items-start gap-2 cursor-pointer select-none text-sm flex-1">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={s.done}
                    onChange={() => { TaskService.toggleStep(selected.meta.id, s.id); refresh(); }}
                  />
                  <span className={s.done ? 'line-through opacity-60' : ''}>{s.label}</span>
                </label>
                <button
                  aria-label="Delete step"
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 border border-gray-600 rounded hover:bg-gray-800 transition-opacity"
                  onClick={() => { TaskService.removeStep(selected.meta.id, s.id); refresh(); }}
                >✕</button>
              </li>
            ))}
            {!selected.steps.length && <li className="text-xs opacity-70">No steps yet.</li>}
          </ul>
          <form
            className="flex items-center gap-2 pt-2"
            onSubmit={e => {
              e.preventDefault();
              const label = newStepLabel.trim();
              if (!label) return;
              const ordinal = (selected.steps.reduce((m,s)=>Math.max(m,s.ordinal),0) || 0) + 1;
              TaskService.addStep(selected.meta.id, { id: crypto.randomUUID(), label, done: false, ordinal });
              setNewStepLabel('');
              refresh();
            }}
          >
            <input
              type="text"
              value={newStepLabel}
              onChange={e=>setNewStepLabel(e.target.value)}
              placeholder="New step label"
              aria-label="New step label"
              className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded outline-none focus:border-[#39FF14]"
            />
            <button
              type="submit"
              className="text-xs border border-gray-600 px-2 py-1 rounded hover:bg-gray-800 disabled:opacity-40"
              disabled={!newStepLabel.trim()}
            >Add</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskChecklist;
