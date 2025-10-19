/* LEEWAY HEADER
TAG: CORE.NOTEPAD.CLAMPS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: shield-check
ICON_SIG: CD534113
5WH: WHAT=Schema clamps/guards for Notepad OS payloads; WHY=Protect integrity and size; WHO=Leeway Core; WHERE=src/lib/notepad/schema-clamp.ts; WHEN=2025-10-06; HOW=TypeScript functional guards
SPDX-License-Identifier: MIT
*/

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export interface ClampOptions {
  maxText?: number; // max length for any text field
  maxTags?: number; // max number of tags
  maxArtifacts?: number; // max number of artifacts
}

export interface ArtifactIn {
  name: string;
  text?: string;
  type?: string;
}

export interface TaskPayloadIn {
  title: string;
  utterance?: string;
  meta?: Record<string, Json>;
  tags?: string[];
}

const DEFAULTS: Required<ClampOptions> = {
  maxText: 20_000,
  maxTags: 16,
  maxArtifacts: 12,
};

function clampString(input: unknown, max: number): string | undefined {
  if (typeof input !== 'string') return undefined;
  return input.length > max ? input.slice(0, max) : input;
}

function clampTags(input: unknown, maxTags: number, maxText: number): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: string[] = [];
  for (const t of input) {
    if (typeof t !== 'string') continue;
    const v = t.trim();
    if (!v) continue;
    out.push(v.slice(0, maxText));
    if (out.length >= maxTags) break;
  }
  return out.length ? out : undefined;
}

export function clampTaskPayload(input: TaskPayloadIn, opts: ClampOptions = {}): Required<TaskPayloadIn> {
  const o = { ...DEFAULTS, ...opts };
  const title = clampString(input.title, 256) || 'Untitled';
  const utterance = clampString(input.utterance, o.maxText) || '';
  const tags = clampTags(input.tags, o.maxTags, 64) || [];
  const meta: Record<string, Json> = {};
  if (input.meta && typeof input.meta === 'object') {
    // shallow copy primitives only
    for (const [k, v] of Object.entries(input.meta)) {
      if (
        v === null ||
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        meta[k] = v;
      }
    }
  }
  return { title, utterance, meta, tags };
}

export interface ClampedArtifact {
  name: string;
  text?: string;
  type?: string;
}

export function clampArtifacts(input: ArtifactIn[] | undefined, opts: ClampOptions = {}): ClampedArtifact[] {
  if (!input || !Array.isArray(input)) return [];
  const o = { ...DEFAULTS, ...opts };
  const out: ClampedArtifact[] = [];
  for (const a of input) {
    if (!a || typeof a.name !== 'string') continue;
    const name = clampString(a.name, 128) || 'artifact';
    const text = clampString(a.text, o.maxText);
    const type = clampString(a.type, 64);
    out.push({ name, text, type });
    if (out.length >= o.maxArtifacts) break;
  }
  return out;
}
