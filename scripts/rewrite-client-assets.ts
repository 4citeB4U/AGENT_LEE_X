// Run: npm run codemod:assets
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const scanDirs = ["app", "src", "public", "pages", "workers"];
const exts = new Set([".html", ".tsx", ".jsx", ".ts", ".js", ".css"]);
const forbiddenFile = path.join(ROOT, "scripts", "forbidden-hosts.txt");

async function readHosts(): Promise<string[]> {
  try {
    const txt = await fs.readFile(forbiddenFile, "utf8");
    return txt
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("#"));
  } catch {
    return [];
  }
}

async function walk(dir: string): Promise<string[]> {
  const results: string[] = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const d of list) {
    const name = path.join(dir, d.name);
    if (name.includes("node_modules") || name.includes(".next") || name.includes("test-results") || name.includes("coverage"))
      continue;
    if (d.isDirectory()) {
      results.push(...(await walk(name)));
    } else if (d.isFile() && exts.has(path.extname(d.name))) {
      results.push(name);
    }
  }
  return results;
}

function escapeForRx(h: string): string {
  return h.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

async function processFiles(): Promise<void> {
  const hosts = await readHosts();
  const files = new Set<string>();

  for (const d of scanDirs) {
    const full = path.join(ROOT, d);
    try {
      await fs.stat(full);
      const list = await walk(full);
      list.forEach(f => files.add(f));
    } catch {
      /* ignore missing roots */
    }
  }

  let changed = 0;
  for (const f of files) {
    try {
      let c = await fs.readFile(f, "utf8");
      if (!c) continue;
      const orig = c;

      // JSX/HTML attribute casing safety
      if (/[.](html|tsx|jsx)$/.test(f)) {
        c = c.replace(/\bcrossorigin=/g, "crossOrigin=").replace(/\bcharset=/g, "charSet=");
      }

      // Rewrite forbidden hosts to /assets/host/<path>
      for (const h of hosts) {
        const esc = escapeForRx(h);
        const re = new RegExp(`(https?:\\/\\/)${esc}(\\/[^\\s'"\\\`<>]*)`, "gi");
        c = c.replace(re, (_m, _prefix, rest) => `/assets/${h}${rest}`);
      }

      if (c !== orig) {
        await fs.writeFile(f, c, "utf8");
        console.log("Patched", f);
        changed++;
      }
    } catch {
      // ignore per-file errors
    }
  }
  console.log("Done. Files changed:", changed);
}

processFiles().catch(err => {
  console.error(err);
  process.exit(1);
});
