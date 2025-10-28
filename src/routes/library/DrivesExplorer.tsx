/* LEEWAY HEADER
TAG: FRONTEND.ROUTE.DRIVES_EXPLORER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: folder-tree
ICON_SIG: CD534113
5WH: WHAT=Browse NotepadOS drives (R, A, LEE, etc.); WHY=Expose Digital Book of Life; WHO=Leeway Core; WHERE=src/routes/library/DrivesExplorer.tsx; WHEN=2025-10-28; HOW=React + memoryStore
SPDX-License-Identifier: MIT
*/

import React, { useMemo, useState } from 'react';
import memoryStore, { type BaseItem, type DriveKey } from '../../lib/memoryStore';

const DRIVE_LABEL: Record<DriveKey, string> = {
  R: 'Drive R',
  A: 'Drive A',
  L: 'Drive L',
  LEE: 'Drive LEE',
  D: 'Drive D',
  E: 'Drive E',
  O: 'Drive O',
  N: 'Drive N',
};

const ALL_DRIVES: DriveKey[] = ['LEE', 'R', 'A', 'L', 'D', 'E', 'O', 'N'];

const DrivesExplorer: React.FC = () => {
  const [activeDrive, setActiveDrive] = useState<DriveKey>('LEE');

  const items = useMemo<BaseItem[]>(() => memoryStore.list({ drive: activeDrive, includeRecycled: false }), [activeDrive]);

  return (
    <div className="min-h-screen bg-black text-green-100 p-6 font-mono">
      <h1 className="text-2xl font-bold mb-4 text-[#39FF14]">Agent Lee — Drives Explorer</h1>
      <p className="mb-4 text-gray-300">Browse the Digital Book of Life drives. Click an item to view details.</p>

      <div className="flex gap-2 flex-wrap mb-4">
        {ALL_DRIVES.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDrive(d)}
            className={`px-3 py-2 rounded border ${activeDrive===d?'border-emerald-500 text-emerald-300 bg-emerald-900/20':'border-gray-600 text-gray-300 bg-gray-800/40'}`}
          >{DRIVE_LABEL[d]}</button>
        ))}
      </div>

      <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
        {items.length === 0 ? (
          <div className="text-gray-400">No items found on {DRIVE_LABEL[activeDrive]}.</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {items.map(it => (
              <li key={it.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">{it.title}</div>
                    <div className="text-xs text-gray-400">{new Date(it.updated).toLocaleString()} · {it.tags.join(', ')}</div>
                    {it.utterance && (
                      <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {it.utterance.slice(0, 1200)}{it.utterance.length>1200?'…':''}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      className="px-3 py-1 rounded border border-indigo-500 text-indigo-300 hover:bg-indigo-900/20"
                      onClick={() => {
                        try { memoryStore.setActive(it.id); } catch {}
                        alert('Item set active in Notepad OS. Open Notepad to edit.');
                      }}
                    >Open</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DrivesExplorer;
