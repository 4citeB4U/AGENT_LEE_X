#!/usr/bin/env ts-node
/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: SCRIPTS.HEADER_MIGRATOR
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: file-cog
ICON_SIG: HEADER_MIGRATOR
5WH: WHAT=Apply/Audit canonical lightweight headers; WHY=Governance compliance & drift prevention; WHO=Leeway Core; WHERE=scripts/header-migrator.ts; WHEN=2025-10-05; HOW=fast-glob + prepend if missing
SPDX-License-Identifier: MIT
*/

/**
 * Modes:
 *  --apply  : writes missing headers
 *  --audit  : reports only (default if --apply not passed)
 */
import glob from 'fast-glob';
import { promises as fs } from 'node:fs';
import { cwd } from 'node:process';

const ROOT = cwd();
const APPLY = process.argv.includes('--apply');
const AUDIT = process.argv.includes('--audit') || !APPLY;
const GLOBS = [
  'src/**/*.{ts,tsx,md}',
  'scripts/**/*.{ts,tsx}',
  '*.md'
];

const headerTemplate = (region: string) => `/* LEEWAY HEADER — DO NOT REMOVE\nregion: ${region}\nCOLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8\nSPDX-License-Identifier: MIT\n*/`;

function regionFor(p: string) {
  const lower = p.toLowerCase();
  if (lower.includes('persona')) return 'ui.config.persona_prompts.v2';
  if (lower.includes('prompts')) return 'ui.config.prompts.v3';
  if (lower.includes('tasks'))   return 'ui.lib.planner.todo.v2';
  return 'repo.misc';
}

async function ensureHeader(path: string) {
  const raw = await fs.readFile(path, 'utf8');
  if (/LEEWAY HEADER — DO NOT REMOVE/.test(raw)) {
    return { updated: false, had: true };
  }
  if (AUDIT) return { updated: false, had: false };
  const region = regionFor(path);
  const prefix = headerTemplate(region) + '\n';
  const next = path.endsWith('.md') ? `\n${prefix}${raw}` : prefix + raw;
  await fs.writeFile(path, next, 'utf8');
  return { updated: true, had: false };
}

(async () => {
  const files = await glob(GLOBS, { cwd: ROOT, dot: false, absolute: true });
  let added = 0; let have = 0;
  for (const f of files) {
    try {
      const { updated, had } = await ensureHeader(f);
      if (updated) added++;
      if (had) have++;
    } catch (e) {
      console.warn('[header-migrator] skip', f, (e as Error).message);
    }
  }
  const msg = APPLY
    ? `Migrator applied headers to ${added} file(s); ${have} already compliant.`
    : `Audit: ${have} compliant; ${(files.length - have)} missing (run with --apply).`;
  // eslint-disable-next-line no-console
  console.log(msg);
})();
