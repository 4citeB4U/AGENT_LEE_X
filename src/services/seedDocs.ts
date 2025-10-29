/*
LEEWAY HEADER — DO NOT REMOVE
TAG: CORE.SERVICES.SEED_DOCS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: book-open
ICON_SIG: CD534113
5WH: WHAT=Seed Markdown docs into LEE drive; WHY=Make docs permanently available in-app; WHO=Leeway Core; WHERE=src/services/seedDocs.ts; WHEN=2025-10-28; HOW=Vite glob + NotepadOS facade
SPDX-License-Identifier: MIT
*/

import memoryStore from '../lib/memoryStore';

const SEED_FLAG = 'seed_lee_docs_v1';

function titleFromPath(path: string): string {
  try {
    const name = path.split('/').pop() || path;
    return name.replace(/[-_]/g, ' ');
  } catch {
    return path;
  }
}

export async function seedLeeDocs(force = false) {
  try {
    if (typeof window === 'undefined') return;
    const already = localStorage.getItem(SEED_FLAG) === 'true';
    if (already && !force) return;

    // Collect markdown from known locations. Only matched files are included.
    const files: Record<string, string> = {
      // eager allows direct content values; use query/import per Vite 6 deprecation
      ...import.meta.glob('/README.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/README.*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/cf-proxy/README.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/scripts/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/DEPLOYMENT*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
      ...import.meta.glob('/LeeWay_Standards/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
    };

    const entries = Object.entries(files);
    if (entries.length === 0) {
      // No files discovered; do not set the seed flag so we can retry later (e.g., after moving files)
      return;
    }

    for (const [path, content] of entries) {
      try {
        const title = titleFromPath(path);
        const created = await memoryStore.createTask(title, { utterance: content, tags: ['doc', 'LEE'] }, { drive: 'LEE' });
        await memoryStore.attachArtifacts(created.id, [
          { name: 'path', text: path, type: 'text/path' },
          { name: 'format', text: 'markdown', type: 'text/plain' },
        ]);
      } catch {/* continue */}
    }

    localStorage.setItem(SEED_FLAG, 'true');
  } catch {/* ignore */}
}
