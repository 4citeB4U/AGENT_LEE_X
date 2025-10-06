#!/usr/bin/env node
/**
 * LEEWAY HEADER MIGRATOR (ALLOWLIST MODE)
 * Safely injects canonical headers & removes legacy markers only in authored source.
 *
 * Usage:
 *   node scripts/leeway_header_migrator.mjs --dry-run     (preview)
 *   node scripts/leeway_header_migrator.mjs --apply       (write changes)
 *   node scripts/leeway_header_migrator.mjs --apply --backup (write + .bak originals)
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ALLOW_DIRS = [ 'components','contexts','services','src','utils','scripts','LeeWay_Standards' ];
const ALLOW_FILES = [ 'index.html','vite.config.ts','types.ts' ];
const EXCLUDE_DIR_PREFIX = [ 'android','ios','node_modules','dist','build','run','public/assets','vendor','vite-6.3.6','backend/run' ];
const EXCLUDE_EXT = new Set(['.d.ts','.ico','.png','.jpg','.jpeg','.svg','.map','.json']);
const LEGACY_REGEX = /(^(REGION|ICON_ASCII|SIG|AGENTS):.*$)/m;
const LEGACY_LINE = /^\s*(REGION|ICON_ASCII|SIG|AGENTS):/;

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const APPLY = args.has('--apply');
const BACKUP = args.has('--backup');
if (!DRY && !APPLY) {
  console.log('ℹ️  No mode flag provided. Use --dry-run or --apply');
  process.exit(0);
}

function headerTemplate(rel) {
  const when = new Date().toISOString().slice(0,10);
  return `/* LEEWAY CANONICAL HEADER — DO NOT REMOVE\nTAG: LEEWAY_CANONICAL_HEADER\nCOLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE\nICON_FAMILY: lucide\nICON_GLYPH: code\nICON_SIG: AUTO-MIGRATE\n5WH: WHAT=Canon header inject; WHY=Standardize & purge legacy markers; WHO=Agent Lee Automation; WHERE=${rel}; WHEN=${when}; HOW=allowlisted migrator;\nSPDX-License-Identifier: MIT\n*/\n\n`;
}

function inAllowScope(rel) {
  if (ALLOW_FILES.includes(rel)) return true;
  if (EXCLUDE_DIR_PREFIX.some(p => rel.startsWith(p))) return false;
  if (ALLOW_DIRS.some(d => rel.startsWith(d + '/'))) return true;
  return false;
}

let examined=0, rewritten=0, skipped=0, unchanged=0; const touched=[];

function processFile(full) {
  const rel = path.relative(ROOT, full).replace(/\\/g,'/');
  if (!inAllowScope(rel)) { skipped++; return; }
  const ext = path.extname(full);
  if (EXCLUDE_EXT.has(ext)) { skipped++; return; }
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|html)$/.test(full)) { skipped++; return; }
  examined++;
  let raw; try { raw = fs.readFileSync(full,'utf8'); } catch { skipped++; return; }
  const firstChunk = raw.slice(0, 1000);
  const hasCanonical = firstChunk.includes('TAG: LEEWAY_CANONICAL_HEADER');
  const hasLegacy = LEGACY_REGEX.test(firstChunk);
  if (!hasLegacy && hasCanonical) { unchanged++; return; }

  // Clean legacy lines only in first 60 lines
  const lines = raw.split(/\r?\n/);
  for (let i=0; i<Math.min(lines.length,60); i++) {
    if (LEGACY_LINE.test(lines[i])) lines[i] = '';
  }
  // Remove existing canonical if applying to avoid stacking duplicates
  if (hasCanonical) {
    const start = lines.findIndex(l=>l.includes('LEEWAY CANONICAL HEADER'));
    if (start >= 0) {
      // naive removal of initial block comment
      let endIdx = start;
      while (endIdx < lines.length && !lines[endIdx].includes('*/')) endIdx++;
      if (endIdx < lines.length) {
        lines.splice(start, endIdx-start+1);
      }
    }
  }
  while (lines.length && lines[0].trim()==='') lines.shift();
  const newBody = lines.join('\n').replace(/\n{3,}/g,'\n\n');
  const output = headerTemplate(rel) + newBody.trimStart();
  if (DRY) {
    touched.push(rel);
    return;
  }
  if (APPLY) {
    if (BACKUP) { try { fs.writeFileSync(full+'.bak', raw,'utf8'); } catch {} }
    fs.writeFileSync(full, output,'utf8');
    rewritten++; touched.push(rel);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const rel = path.relative(ROOT, full).replace(/\\/g,'/');
      if (EXCLUDE_DIR_PREFIX.some(p => rel.startsWith(p))) continue;
      walk(full);
    } else {
      processFile(full);
    }
  }
}

console.log(`\n🚀 LEEWAY Migrator (${DRY? 'DRY-RUN':'APPLY'})`);
ALLOW_DIRS.forEach(d => { const p = path.join(ROOT,d); if (fs.existsSync(p)) walk(p); });
ALLOW_FILES.forEach(f => { const p = path.join(ROOT,f); if (fs.existsSync(p)) processFile(p); });

console.log('\nSummary');
console.log(' Examined :', examined);
console.log(' Rewritten:', rewritten, DRY ? '(simulated)' : '');
console.log(' Unchanged:', unchanged);
console.log(' Skipped  :', skipped);
console.log(' Touched  :', touched.length);
if (touched.length) {
  console.log('\nFiles to change:' + (DRY ? ' (preview)' : ''));
  for (const f of touched) console.log(' •', f);
}
console.log('\nNext: node scripts/leeway_header_audit.mjs');
process.exit(0);
