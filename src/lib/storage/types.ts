/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LIB.STORAGE.TYPES
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: database
ICON_SIG: STORAGE_TYPES
5WH: WHAT=Unified autosave+sync types; WHY=Portable persistence & drive abstraction; WHO=Leeway Core; WHERE=src/lib/storage/types.ts; WHEN=2025-10-05; HOW=TypeScript interfaces
SPDX-License-Identifier: MIT
*/

export type SavedKind = 'result' | 'note' | 'settings';

export interface SavedPayload {
  kind: SavedKind;
  id: string;           // stable logical id (e.g., active note id or "current-result")
  version: number;      // incrementing timestamp/monotonic local version
  updatedAt: string;    // ISO timestamp
  content: unknown;     // payload specific data
  feature?: string;     // optional: 'research' | 'text' | 'image' | 'analysis' etc.
}

export interface DriveWrite {
  id: string;
  blob: Blob | null;
  json?: unknown;
  pathHint?: string;     // e.g., "agentlee/snapshots/<kind>/<id>.json"
}

export interface DriveAdapter {
  name: 'local' | 'leonard' | 'lee';
  write(item: DriveWrite): Promise<{ ok: true } | { ok: false; error: string }>;
  read?(id: string): Promise<unknown | null>;
}
