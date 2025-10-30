/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.EXPLORER_SHELL
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: folder
ICON_SIG: CD534113
5WH: WHAT=Windows 11–style Explorer shell wrapper; WHY=Consistent file UI around Notepad; WHO=Leeway Core; WHERE=components/ExplorerShell.tsx; WHEN=2025-10-30; HOW=React + minimal CSS-in-component
SPDX-License-Identifier: MIT
*/

import React, { PropsWithChildren, useContext, useMemo } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import type { Note } from '../types';

// Local helpers mirror AgentNotepad drive/tag derivation to render breadcrumb

type DriveKey = 'LEE' | 'L' | 'E' | 'O' | 'N' | 'A' | 'R' | 'D';

const DRIVE_LABELS: Record<DriveKey, string> = {
  LEE: 'Lee Registry',
  L: 'Drive L — Surface UI',
  E: 'Drive E — Evidence',
  O: 'Drive O — Operations Cache',
  N: 'Drive N — Nexus Streams',
  A: 'Drive A — Analysis Lab',
  R: 'Drive R — Runbook Notes',
  D: 'Drive D — Defense Logs'
};

const getDriveShortName = (drive: DriveKey): string => {
  const [shortName] = DRIVE_LABELS[drive].split(' — ');
  return shortName || DRIVE_LABELS[drive];
};

const sanitizeForPath = (input: string): string => input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'draft';

const buildPathDisplay = (drive: DriveKey, noteTitle?: string): string => {
  const base = drive === 'LEE' ? 'LEE://registry' : `LEONARD://${drive.toLowerCase()}`;
  if (!noteTitle) return base;
  return `${base}/${sanitizeForPath(noteTitle)}`;
};

const deriveDriveFromTag = (tag?: string): DriveKey => {
  if (!tag) return 'R';
  const normalized = tag.toUpperCase();
  const tokens = normalized.split(/[^A-Z]+/).filter(Boolean);
  const order: DriveKey[] = ['LEE', 'L', 'E', 'O', 'N', 'A', 'R', 'D'];
  const explicit = order.find(key => normalized.includes(`DRIVE-${key}`) || normalized.includes(`[${key}]`) || tokens.includes(key));
  return explicit || 'R';
};

export type ExplorerShellProps = PropsWithChildren<{
  title?: string;
  onNew?: () => void;
  onRename?: (note: Note) => void;
  onRefresh?: () => void;
}>;

const ExplorerShell: React.FC<ExplorerShellProps> = ({ children, title = 'Explorer', onNew, onRename, onRefresh }) => {
  const { notes, activeNoteId } = useContext(NotepadContext);
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);
  const drive = useMemo<DriveKey>(() => (activeNote ? deriveDriveFromTag(activeNote.tag) : 'R'), [activeNote]);
  const path = useMemo(() => buildPathDisplay(drive, activeNote?.title), [drive, activeNote]);

  const styles = `
    .explorer-shell { display:flex; flex-direction:column; gap:8px; height:100%; color:#e7fdf2; }
    .explorer-commandbar { display:flex; align-items:center; justify-content:space-between; background:linear-gradient(90deg,#0d1d17,#07120f); border:1px solid rgba(57,255,20,0.25); border-radius:12px; padding:10px 12px; }
    .command-left, .command-right { display:flex; align-items:center; gap:8px; }
    .cmd-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#C7FFD8; cursor:pointer; font-size:.8rem; }
    .cmd-btn:hover { background:rgba(57,255,20,0.22); color:#0b1f16; }
    .cmd-btn[disabled] { opacity:.6; cursor:not-allowed; }
    .address-bar { flex:1; margin:0 10px; display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.35); border:1px solid rgba(57,255,20,0.25); border-radius:8px; padding:6px 10px; min-width:0; }
    .crumb { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:.9; }
    .crumb.crumb--drive { max-width:45%; }
    .crumb.crumb--note { max-width:45%; }
    .icon-green { color:#39FF14; }
    .explorer-content { flex:1; min-height:0; background:transparent; border-radius:12px; }
    .statusbar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 10px; background:linear-gradient(90deg,#0c1814,#08110e); border:1px solid rgba(57,255,20,0.2); border-radius:10px; font-size:.78rem; color:#c7ffd8; }
    .status-left,.status-right{ display:flex; align-items:center; gap:10px; }
    .badge { padding:4px 8px; border-radius:999px; background:rgba(57,255,20,0.12); border:1px solid rgba(57,255,20,0.25); color:#39FF14; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; }
  `;

  return (
    <div className="explorer-shell">
      <style>{styles}</style>
      <div className="explorer-commandbar">
        <div className="command-left">
          <button className="cmd-btn" title="Back" disabled>
            <i className="fa-solid fa-arrow-left" />
          </button>
          <button className="cmd-btn" title="Forward" disabled>
            <i className="fa-solid fa-arrow-right" />
          </button>
          <button className="cmd-btn" title="Up" onClick={onRefresh}>
            <i className="fa-solid fa-arrow-up" />
            <span>Up</span>
          </button>
          <div className="address-bar" title={path}>
            <i className="fa-solid fa-folder icon-green" />
            <div className="crumb crumb--drive">{getDriveShortName(drive)}</div>
            <i className="fa-solid fa-angles-right" />
            <div className="crumb crumb--note">{activeNote?.title || '—'}</div>
          </div>
        </div>
        <div className="command-right">
          <button className="cmd-btn" onClick={onNew} title="New">
            <i className="fa-solid fa-plus" />
            <span>New</span>
          </button>
          <button className="cmd-btn" onClick={() => activeNote && onRename?.(activeNote)} title="Rename" disabled={!activeNote}>
            <i className="fa-solid fa-i-cursor" />
            <span>Rename</span>
          </button>
          <button className="cmd-btn" onClick={onRefresh} title="Refresh">
            <i className="fa-solid fa-rotate" />
          </button>
        </div>
      </div>
      <div className="explorer-content">{children}</div>
      <div className="statusbar">
        <div className="status-left">
          <span className="badge">{getDriveShortName(drive)}</span>
          <span>{path}</span>
        </div>
        <div className="status-right">
          <span className="badge">LEEWAY v11</span>
          <span>Active: {activeNote ? '1 file open' : 'No file selected'}</span>
        </div>
      </div>
    </div>
  );
};

export default ExplorerShell;
