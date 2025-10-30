/* LEEWAY HEADER
TAG: FRONTEND.ROUTE.DRIVES_EXPLORER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: folder-tree
ICON_SIG: CD534113
5WH: WHAT=Browse NotepadOS drives (R, A, LEE, etc.); WHY=Expose Digital Book of Life; WHO=Leeway Core; WHERE=src/routes/library/DrivesExplorer.tsx; WHEN=2025-10-28; HOW=React + memoryStore
SPDX-License-Identifier: MIT
*/

import React, { useEffect, useMemo, useState } from 'react';
import memoryStore, { type Artifact, type BaseItem, type DriveKey } from '../../lib/memoryStore';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState<string>('');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [journal, setJournal] = useState<Array<{ ts: number; type: string; notes?: string }>>([]);
  const [saving, setSaving] = useState(false);

  const items = useMemo<BaseItem[]>(() => memoryStore.list({ drive: activeDrive, includeRecycled: false }), [activeDrive]);
  const selected = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      setArtifacts(memoryStore.listArtifacts(selectedId));
      const st = memoryStore.exportState() as any;
      const j = Array.isArray(st?.journal) ? st.journal.filter((e: any) => e.ownerId === selectedId) : [];
      setJournal(j.sort((a: any, b: any) => a.ts - b.ts));
    } catch {
      setArtifacts([]);
      setJournal([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selected) setRenameTitle(selected.title);
  }, [selected]);

  const exportText = () => {
    if (!selected) return;
    const lines = [
      `Title: ${selected.title}`,
      `Drive: ${selected.drive}`,
      `Updated: ${new Date(selected.updated).toISOString()}`,
      `Tags: ${selected.tags.join(', ')}`,
      '',
      selected.utterance || ''
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(selected.title||'note').replace(/[^a-z0-9\-\s]/gi,'').slice(0,60) || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJson = () => {
    if (!selected) return;
    const payload = { ...selected, artifacts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(selected.title||'note').replace(/[^a-z0-9\-\s]/gi,'').slice(0,60) || 'note'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveRename = async () => {
    if (!selected) return;
    setSaving(true);
    try { await memoryStore.update(selected.id, { title: renameTitle }); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-black text-green-100 p-6 font-mono">
      <h1 className="text-2xl font-bold mb-4 text-[#39FF14]">Agent Lee — Drives Explorer</h1>
      <p className="mb-4 text-gray-300">Browse, open, rename, and export files. The right pane shows the full conversation/content.</p>

      <div className="flex gap-2 flex-wrap mb-4">
        {ALL_DRIVES.map((d) => (
          <button
            key={d}
            onClick={() => { setActiveDrive(d); setSelectedId(null); }}
            className={`px-3 py-2 rounded border ${activeDrive===d?'border-emerald-500 text-emerald-300 bg-emerald-900/20':'border-gray-600 text-gray-300 bg-gray-800/40'}`}
          >{DRIVE_LABEL[d]}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
          {items.length === 0 ? (
            <div className="text-gray-400">No items found on {DRIVE_LABEL[activeDrive]}.</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {items.map(it => (
                <li key={it.id} className={`py-3 ${selectedId===it.id?'bg-gray-800/40':''}`}>
                  <button className="w-full text-left" onClick={() => setSelectedId(it.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{it.title}</div>
                        <div className="text-xs text-gray-400">{new Date(it.updated).toLocaleString()} · {it.tags.join(', ')}</div>
                        {it.utterance && (
                          <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {it.utterance.slice(0, 400)}{it.utterance.length>400?'…':''}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex gap-2">
                        <span className="px-2 py-0.5 text-xs rounded border border-gray-600 text-gray-300">{it.drive}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-900/40 border border-gray-700 rounded p-3 min-h-[300px]">
          {!selected ? (
            <div className="text-gray-400">Select a file to see details.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setSelectedId(null)} className="px-2 py-1 rounded border border-gray-600 hover:bg-gray-800/50">← Back</button>
                <div className="flex gap-2">
                  <button onClick={exportText} className="px-3 py-1 rounded border border-teal-500 text-teal-300 hover:bg-teal-900/20">Export .txt</button>
                  <button onClick={exportJson} className="px-3 py-1 rounded border border-sky-500 text-sky-300 hover:bg-sky-900/20">Export .json</button>
                  <button
                    onClick={() => { try { memoryStore.setActive(selected.id); window.location.hash = '#/notepad'; } catch {} }}
                    className="px-3 py-1 rounded border border-indigo-500 text-indigo-300 hover:bg-indigo-900/20"
                  >Open in Notepad</button>
                </div>
              </div>

              <div>
                <label htmlFor="rename-input" className="block text-xs text-gray-400 mb-1">Name</label>
                <div className="flex gap-2">
                  <input id="rename-input" value={renameTitle} onChange={e=>setRenameTitle(e.target.value)} className="flex-1 px-2 py-1 rounded bg-black/40 border border-gray-700 text-gray-100" />
                  <button onClick={saveRename} disabled={saving} className="px-3 py-1 rounded border border-emerald-500 text-emerald-300 hover:bg-emerald-900/20 disabled:opacity-50">{saving? 'Saving…':'Save'}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400">Drive</div>
                  <div className="text-sm">{selected.drive}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Updated</div>
                  <div className="text-sm">{new Date(selected.updated).toLocaleString()}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Tags</div>
                  <div className="text-sm">{selected.tags.join(', ') || '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Content</div>
                <div className="p-3 rounded bg-black/30 border border-gray-800 max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm">
                  {selected.utterance || '(empty)'}
                </div>
              </div>

              {artifacts.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Artifacts ({artifacts.length})</div>
                  <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                    {artifacts.map(a => (
                      <li key={a.id}>
                        <span className="text-gray-300">{a.name}</span>
                        {a.type ? <span className="text-gray-500"> · {a.type}</span> : null}
                        {a.text ? <span className="text-gray-500"> · {a.text.slice(0,100)}{a.text.length>100?'…':''}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-400 mb-1">History</div>
                {journal.length === 0 ? (
                  <div className="text-gray-500 text-sm">No history recorded.</div>
                ) : (
                  <ul className="text-sm text-gray-300 space-y-1 max-h-40 overflow-y-auto">
                    {journal.map((j, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-gray-500">{new Date(j.ts).toLocaleString()}</span>
                        <span>·</span>
                        <span className="uppercase text-xs text-gray-400">{j.type}</span>
                        {j.notes ? <span className="text-gray-500">— {j.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrivesExplorer;
