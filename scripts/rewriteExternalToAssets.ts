import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

const ROOTS = ['app','src','public','pages','workers'];
const EXTS = ['.ts','.tsx','.js','.jsx','.html','.css'];
const FORBIDDEN_LIST = path.join(process.cwd(), 'scripts', 'forbidden-hosts.txt');

function readForbidden(): string[] {
  if (!fs.existsSync(FORBIDDEN_LIST)) return [];
  return fs.readFileSync(FORBIDDEN_LIST, 'utf8')
    .split(/\r?\n/).map(s => s.trim())
    .filter(s => s && !s.startsWith('#'));
}

function escapeRx(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteFile(p: string, hosts: string[]): boolean {
  const c = fs.readFileSync(p, 'utf8');
  let n = c;
  for (const h of hosts) {
    const rx = new RegExp(`https?:\\/\\/${escapeRx(h)}\\/([^\\s'"<>]+)`, 'gi');
    n = n.replace(rx, (_m, g1) => `/assets/${h}/${g1}`);
  }
  if (n !== c) {
    fs.writeFileSync(p, n, 'utf8');
    console.log('Rewrote ->', p);
    return true;
  }
  return false;
}

async function run() {
  const hosts = readForbidden();
  if (hosts.length === 0) {
    console.log('No forbidden hosts listed; skipping.');
    return;
  }
  const patterns = ROOTS.map(r => `${r}/**/*{${EXTS.map(e=>e.slice(1)).join(',')}}`);
  const files = await fg(patterns, {
    ignore: ['**/node_modules/**','**/.next/**','**/coverage/**','**/test-results/**']
  });
  let changed = 0;
  for (const p of files) {
    try { if (rewriteFile(p, hosts)) changed++; } catch (e) { console.warn('Skip', p, e); }
  }
  console.log(`Done. Changed ${changed} file(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
