/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: FRONTEND.UI.TASKS_PANEL
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: list-checks
ICON_SIG: TASKS_PANEL
5WH: WHAT=Wrapper panel rendering TaskChecklist; WHY=Expose tasks feature tab; WHO=Leeway Core; WHERE=src/components/TasksPanel.tsx; WHEN=2025-10-05; HOW=React 19 + TaskService seeding (dev)
SPDX-License-Identifier: MIT
*/

import React, { useEffect } from 'react';
import { TaskService } from '../lib/tasks/taskService';
import TaskChecklist from './TaskChecklist';

const seedId = 'ui.checklist.demo';

const TasksPanel: React.FC = () => {
  useEffect(() => {
    if (import.meta.env && import.meta.env.DEV) {
      const existing = TaskService.get(seedId as any);
      if (!existing) {
        TaskService.upsert({
          meta: {
            id: seedId,
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
            tags: ['ui','release']
        } as any);
      }
    }
  }, []);
  return (
    <div className="p-4">
      <TaskChecklist filterTag="release" />
    </div>
  );
};

export default TasksPanel;
