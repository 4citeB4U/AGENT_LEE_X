#!/usr/bin/env node
/* LEEWAY HEADER
TAG: TOOLING.AUDIT.HEADERS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: shield-check
ICON_SIG: CD534113
5WH: WHAT=Header compliance audit; WHY=Enforce canonical Leeway header spec; WHO=Leeway Core (agnostic); WHERE=scripts/leeway_header_audit.mjs; WHEN=2025-10-05; HOW=Node.js script
SPDX-License-Identifier: MIT
*/
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();

// Allowed header keys (first comment block) - order flexible but keys restricted
const ALLOWED_KEYS = [
  'TAG','COLOR_ONION_HEX','ICON_FAMILY','ICON_GLYPH','ICON_SIG','5WH','SPDX-License-Identifier'
];

// Disallowed legacy markers (anchored at line start to avoid matching ICON_SIG, etc.)
const LEGACY_MARKERS = [
  { label: 'REGION', regex: /^REGION:/m },
  { label: 'ICON_ASCII', regex: /^ICON_ASCII/m },
  { label: 'SIG', regex: /^SIG:/m },
  { label: 'AGENTS', regex: /^AGENTS:/m }
];

// File extensions to scan (focus on source first; exclude docs/assets to reduce noise)
const SCAN_EXTS = new Set(['.ts','.tsx','.js','.mjs','.cjs','.html']);

// Directories (partial path match) to skip entirely
const SKIP_DIR_PARTS = [
  'node_modules', 'dist', 'build', 'android', 'ios', 'vite-6.3.6',
  // platform or cache folders
  '.git', '.vscode', '.turbo', '.cache',
  // generated run outputs
  'run', 'public/assets', 'public/images'
];

const errors = [];

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.git')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIR_PARTS.some(skip => full.includes(skip))) continue;
      scanDir(full); 
    } else {
      if (!SCAN_EXTS.has(extname(entry))) continue;
      auditFile(full);
    }
  }
}

function auditFile(file) {
  let text;
  try { text = readFileSync(file,'utf8'); } catch { return; }
  // Only consider the very first non-empty characters; header must start at file top (allow leading shebang)
  const shebangMatch = text.startsWith('#!') ? text.indexOf('\n') : 0;
  const startSlice = shebangMatch > 0 ? text.slice(shebangMatch + 1) : text;
  if (!startSlice.trimStart().startsWith('/*')) {
    // Require header presence for scanned extensions
    errors.push(`${file}: missing top-of-file canonical header block`);
    return;
  }
  const firstCommentMatch = startSlice.match(/\/\*([\s\S]*?)\*\//);
  if (!firstCommentMatch) {
    errors.push(`${file}: malformed header comment`);
    return;
  }
  const header = firstCommentMatch[1];

  // Legacy markers
  for (const legacy of LEGACY_MARKERS) {
    if (legacy.regex.test(header)) {
      errors.push(`${file}: contains legacy marker ${legacy.label}:`);
    }
  }

  // Extract present keys (left of first colon)
  const present = Array.from(header.matchAll(/^([A-Z0-9_-]+):/gm)).map(m => m[1]);
  const unknown = present.filter(k => !ALLOWED_KEYS.includes(k));
  if (unknown.length > 0) {
    errors.push(`${file}: disallowed header keys ${unknown.join(', ')}`);
  }

  // Require minimally TAG + 5WH + SPDX
  ['TAG','5WH','SPDX-License-Identifier'].forEach(req => {
    if (!header.includes(`${req}:`)) {
      errors.push(`${file}: missing required header key ${req}`);
    }
  });
}

scanDir(ROOT);

if (errors.length) {
  console.error(`\nLeeway Header Audit Failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
} else {
  console.log('Leeway Header Audit Passed: All scanned headers compliant.');
}
