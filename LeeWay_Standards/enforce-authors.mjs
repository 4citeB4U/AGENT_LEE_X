#!/usr/bin/env node
/**
 * Enforce authorship across the repo.
 * Auto-fix: MD/MDX YAML front matter, HTML <meta author>, package.json.
 * Validate-only: pyproject.toml and other text files (fails if violations).
 */
import fs from "node:fs";
import {promises as fsp} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWED = ["rapidwebdevelop.com","LEEWAY","LeonardLee"];
const META = ALLOWED.join(", ");

const isText = (p) => /\.(md|mdx|markdown|html?|json|toml|txt|yml|yaml)$/i.test(p);

async function* walk(dir) {
  for (const d of await fsp.readdir(dir, {withFileTypes:true})) {
    const p = path.join(dir, d.name);
    if (d.name === "node_modules" || d.name === ".git" || d.name === "dist" || d.name === "build") continue;
    if (d.isDirectory()) yield* walk(p); else yield p;
  }
}

function normalizeFrontMatterAuthors(text) {
  // Only if YAML front matter exists (--- ... --- at top)
  const m = text.match(/^---\s*[\s\S]*?---/);
  if (!m) return null;
  let block = m[0];
  // Replace any authors line (authors: ... OR author: ...)
  if (/^---[\s\S]*?authors\s*:/im.test(block)) {
    block = block.replace(/authors\s*:\s*\[[^\]]*\]/im, `authors: [${ALLOWED.join(", ")}]`);
    block = block.replace(/author\s*:\s*.*$/im, `authors: [${ALLOWED.join(", ")}]`); // collapse single to array
  } else if (/^---/.test(block)) {
    // insert authors under the first line
    block = block.replace(/^---\s*\n/, `---\nauthors: [${ALLOWED.join(", ")}]\n`);
  }
  return text.replace(/^---[\s\S]*?---/, block);
}

function normalizeHtmlAuthor(text) {
  if (!/</.test(text)) return null;
  if (/<meta\s+name=["']author["']\s+content=/i.test(text)) {
    return text.replace(/<meta\s+name=["']author["']\s+content=["'][^"']*["']\s*\/?>/ig,
      `<meta name="author" content="${META}" />`);
  }
  // insert into <head> if present
  if (/<head[^>]*>/i.test(text)) {
    return text.replace(/<head[^>]*>/i, (h)=> `${h}\n    <meta name="author" content="${META}" />`);
  }
  return null;
}

async function normalizePackageJson(p) {
  const raw = await fsp.readFile(p, "utf8");
  let obj;
  try { obj = JSON.parse(raw); } catch { return false; }
  let changed = false;

  const desiredAuthor = META;
  if (obj.author !== desiredAuthor) { obj.author = desiredAuthor; changed = true; }
  const wantContrib = ALLOWED;
  if (JSON.stringify(obj.contributors||[]) !== JSON.stringify(wantContrib)) {
    obj.contributors = wantContrib; changed = true;
  }
  if (changed) await fsp.writeFile(p, JSON.stringify(obj, null, 2)+"\n");
  return changed;
}

function hasForbiddenAuthors(text) {
  const allow = new Set(ALLOWED.map(a=>a.toLowerCase()));
  const hit = [];
  const patterns = [
    /authors?\s*:\s*\[([^\]]*)\]/gi,     // YAML array
    /author\s*:\s*(.+)$/gim,             // YAML single
    /"author"\s*:\s*"([^"]*)"/gi,        // JSON
    /"contributors"\s*:\s*\[([^\]]*)\]/gi,
    /<meta\s+name=["']author["']\s+content=["']([^"']*)["']/gi
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      const blob = m[1] || m[0];
      const names = blob.split(/[,\n|]+/).map(s=>s.replace(/["'\{\}\[\]\s]/g,"").trim()).filter(Boolean);
      for (const n of names) if (n && !allow.has(n.toLowerCase())) hit.push(n);
    }
  }
  return [...new Set(hit)];
}

(async ()=>{
  let violations = [];
  for await (const p of walk(ROOT)) {
    if (!isText(p)) continue;
    const ext = path.extname(p).toLowerCase();

    // package.json: structured fix
    if (path.basename(p) === "package.json") {
      await normalizePackageJson(p);
      const t2 = await fsp.readFile(p, "utf8");
      const bad = hasForbiddenAuthors(t2);
      if (bad.length) violations.push({file:p, bad});
      continue;
    }

    let text = await fsp.readFile(p, "utf8");
    let updated = null;

    // MD/MDX front matter
    if (/\.(md|mdx|markdown)$/i.test(ext)) {
      const t2 = normalizeFrontMatterAuthors(text);
      if (t2) { text = t2; updated = true; }
    }

    // HTML meta
    if (/\.(html?)$/i.test(ext)) {
      const t3 = normalizeHtmlAuthor(text);
      if (t3) { text = t3; updated = true; }
    }

    if (updated) await fsp.writeFile(p, text, "utf8");

    // Validate for any forbidden authors (covers TOML, YAML, misc)
    const bad = hasForbiddenAuthors(text);
    if (bad.length) violations.push({file:p, bad});
  }

  if (violations.length) {
    console.error("Authorship violations found:");
    for (const v of violations) console.error(`- ${v.file}: ${v.bad.join(", ")}`);
    process.exit(1);
  } else {
    console.log("Authorship OK: all files comply with allowlist.");
  }
})();
