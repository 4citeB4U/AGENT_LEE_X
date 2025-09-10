import fs from 'fs';
import fg from 'fast-glob';

const ROOTS = ['app','src','public','pages','workers'];

async function run() {
  const files = await fg(ROOTS.map(r => `${r}/**/*.{html,tsx,jsx}`), {
    ignore: ['**/node_modules/**','**/.next/**','**/coverage/**','**/test-results/**']
  });
  let touched = 0;
  for (const p of files) {
    const src = fs.readFileSync(p, 'utf8');
    const out = src
      .replace(/\bcrossorigin=/g, 'crossOrigin=')
      .replace(/\bcharset=/g, 'charSet=');
    if (out !== src) {
      fs.writeFileSync(p, out, 'utf8');
      console.log('Patched', p);
      touched++;
    }
  }
  console.log(`Done. Patched ${touched} file(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
