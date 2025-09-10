#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function exists(p: string) {
  try { await fs.access(p); return true } catch { return false }
}

async function readHosts(root: string) {
  const hostsFile = path.join(root, 'scripts', 'forbidden-hosts.txt');
  if (!await exists(hostsFile)) throw new Error(`Missing ${hostsFile}`);
  const raw = await fs.readFile(hostsFile, 'utf8');
  return raw.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}

async function walkDir(dir: string, files: string[] = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, .next, coverage, test-results
      if (/\\node_modules\\|\\.next\\|\\coverage\\|\\test-results\\/i.test(full)) continue;
      await walkDir(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function isClientFile(p: string, exts: string[]) {
  const e = path.extname(p).toLowerCase();
  return exts.includes(e);
}

function escapeForRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

async function main() {
  const root = process.cwd();
  const scanDirs = ['app','pages','components','src','public','workers'];
  const exts = ['.ts','.tsx','.js','.jsx','.html','.css'];

  const hosts = await readHosts(root);
  const filesToScan: string[] = [];
  for (const d of scanDirs) {
    const full = path.join(root, d);
    if (await exists(full)) {
      const all = await walkDir(full);
      for (const f of all) if (isClientFile(f, exts)) filesToScan.push(f);
    }
  }

  let rewrote = 0;
  for (const file of filesToScan) {
    let content: string;
    try { content = await fs.readFile(file, 'utf8'); } catch { continue }
    if (!content) continue;
    let updated = content;

    for (const host of hosts) {
      const esc = escapeForRegExp(host);
      // match https?://<host>/<path> capturing the path (no whitespace, no quotes, backticks, angle brackets)
      const rx = new RegExp(`https?:\\/\\/${esc}(/[^\\s'"` + String.fromCharCode(96) + `<>]+)`, 'gi');
      updated = updated.replace(rx, (_m, g1) => `/assets/${host}${g1}`);
    }

    if (updated !== content) {
      await fs.writeFile(file, updated, 'utf8');
      console.log('Rewrote ->', file);
      rewrote++;
    }
  }

  console.log(`Done. Files rewritten: ${rewrote}`);
}

main().catch(err => { console.error(err); process.exit(1) });
