/* LEEWAY HEADER — DO NOT REMOVE
REGION: QA.CHECKS.UNIFIED_AUDIT.V5
5WH: WHAT=Unified frontend+backend audit + HTML report (OS-agnostic);
WHY=CI gating + human report; WHO=RapidWebDevelop;
WHERE=tools/leeway_unified_audit.ts; WHEN=2025-10-04;
HOW=Node/TS, --strict flags, asset discovery, id lines, --report-html
SPDX-License-Identifier: MIT
*/

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

// ---------- Roots (repo-relative by default; override via env) ----------
const REPO_ROOT = process.env.GITHUB_WORKSPACE || process.cwd();
const FRONTEND_ROOT = path.resolve(REPO_ROOT, process.env.LW_FRONTEND_ROOT || "frontend");
const BACKEND_ROOT  = path.resolve(REPO_ROOT, process.env.LW_BACKEND_ROOT  || "backend");

// ---------- Requirements / Conventions ----------
const FRONTEND_REQUIRED_IMAGES = ["image/macmillionmic.png", "image/macmillionmic2.png"];

// Represent backend required dirs as POSIX-like relative strings but always check with path.join:
const BACKEND_REQUIRED_DIRS = [
  "agentlee_mcp_hub/mcp",
  "checkpoints/converter",
  "checkpoints/base_speakers/EN",
  "checkpoints/base_speakers/ZH",
  "models", "routes", "scripts", "tools", "webrtc", "run",
];

const REQUIRED_PY_PKGS = [
  "fastapi","uvicorn","structlog","pydantic","pydantic-settings",
  "websockets","soundfile","scipy","numpy","ffmpeg-python","jieba",
];

const HEADER_RE = /LEEWAY HEADER|LEEWAY MICRO:/m;
const DUPLICATE_ID_RE = /id=["']([^"']+)["']/g;
const IMG_REF_RE = new RegExp(
  String.raw`(?:(?:src|href)\s*=\s*["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']|import\s+[^'"]+\s+from\s+["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']|["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["'])`,
  "ig"
);

// ---------- CLI ----------
type Mode = "frontend" | "backend" | "all";
const mode: Mode = (["frontend","backend","all"].includes(process.argv[2]) ? (process.argv[2] as Mode) : "all");
function flag(name: string){const a=process.argv.find(x=>x===`--${name}`||x.startsWith(`--${name}=`)); if(!a) return null; if(a===`--${name}`) return true; const [,v]=a.split("="); return v??true;}
const strictArg = (flag("strict") ?? flag("fail") ?? (process.env.LEEWAY_STRICT ? "all" : null)) as string | boolean | null;
const strict: false | "all" | "frontend" | "backend" =
  strictArg === true ? "all" :
  strictArg === "frontend" ? "frontend" :
  strictArg === "backend"  ? "backend"  :
  strictArg === "all"      ? "all"      : false;

const ignoreFfmpeg = !!flag("no-ffmpeg");
const reportHtml   = !!flag("report-html");
const maxHeaderLines = Number(flag("max-header-lines") || 120);

// ---------- FS helpers ----------
const exists = (fp: string)=>{try{fs.accessSync(fp);return true;}catch{return false;}};
const read = (fp: string)=>{try{return fs.readFileSync(fp,"utf8");}catch{return "";}};
function writeJSON(fp: string, obj: unknown){fs.mkdirSync(path.dirname(fp),{recursive:true});fs.writeFileSync(fp,JSON.stringify(obj,null,2),"utf8");}
function rglob(root: string, exts: Set<string>) {
  const out: string[] = [];
  (function walk(d: string){
    let ents: fs.Dirent[];
    try{ents=fs.readdirSync(d,{withFileTypes:true});}catch{return;}
    for(const e of ents){
      const fp = path.join(d,e.name);
      if(e.isDirectory()) walk(fp);
      else if(e.isFile() && exts.has(path.extname(fp).toLowerCase())) out.push(fp);
    }
  })(root);
  return out;
}

// ---------- FRONTEND ----------
function scanHeadersFrontend(root: string, n = 120){
  const files = rglob(root, new Set([".tsx",".ts",".jsx",".js",".mjs",".html",".css",".md"]));
  const missing: string[] = [];
  for (const f of files){
    const t = read(f);
    const hay = n>0 ? t.split("\n").slice(0,n).join("\n") : t;
    if (!HEADER_RE.test(hay)) missing.push(f);
  }
  return missing.sort();
}
function scanDuplicateIds(root: string){
  const files = rglob(root, new Set([".html",".tsx",".jsx"]));
  const counts: Record<string, Record<string, number>> = {};
  const lines:  Record<string, Record<string, number[]>> = {};
  for (const f of files){
    const t = read(f); if(!t) continue;
    let m: RegExpExecArray | null;
    const localCount: Record<string, number> = {};
    const localLines: Record<string, number[]> = {};
    DUPLICATE_ID_RE.lastIndex = 0;
    while((m = DUPLICATE_ID_RE.exec(t))){
      const id = m[1];
      localCount[id] = (localCount[id]??0)+1;
      const line = t.slice(0,m.index).split("\n").length;
      (localLines[id] ||= []).push(line);
    }
    const offenders = Object.fromEntries(Object.entries(localCount).filter(([,c])=>c>1));
    if (Object.keys(offenders).length){
      counts[f] = offenders;
      lines[f]  = Object.fromEntries(Object.keys(offenders).map(k=>[k, localLines[k]||[]]));
    }
  }
  return { duplicate_ids: counts, duplicate_ids_lines: lines };
}
function discoverImageRefs(root: string){
  const files = rglob(root, new Set([".tsx",".ts",".jsx",".js",".mjs",".html",".css",".md"]));
  const refs = new Set<string>();
  for (const f of files){
    const t = read(f); if(!t) continue;
    let m: RegExpExecArray | null;
    IMG_REF_RE.lastIndex = 0;
    while ((m = IMG_REF_RE.exec(t))){
      const rel = (m[1]||m[2]||m[3]||"").replace(/^(\.\/|\/)/,"");
      if (/\.(png|jpe?g|gif|svg|webp)$/i.test(rel)) refs.add(rel);
    }
  }
  return Array.from(refs).sort();
}
function checkAssets(publicDir: string, rels: string[]){
  const res: Record<string, boolean> = {};
  for (const r of rels) res[r] = exists(path.join(publicDir, r));
  return res;
}
function auditFrontend(root: string){
  const headers_missing = scanHeadersFrontend(root, maxHeaderLines);
  const { duplicate_ids, duplicate_ids_lines } = scanDuplicateIds(root);
  const discovered = discoverImageRefs(root);
  const required_assets   = checkAssets(path.join(root,"public"), FRONTEND_REQUIRED_IMAGES);
  const discovered_assets = checkAssets(path.join(root,"public"), discovered);
  return {
    headers_missing,
    duplicate_ids,
    duplicate_ids_lines,
    required_assets,
    discovered_assets,
    root,
    config: {
      strict: strict ? String(strict) : "",
      format: "json",
      max_header_lines: String(maxHeaderLines),
      workers: "node:sync",
      ignore_file: "",
    }
  };
}

// ---------- BACKEND ----------
function haveFfmpeg(): boolean {
  // Try generic 'ffmpeg', Windows .exe, and 'which/where' fallbacks
  const tryCmd = (cmd: string) => {
    try { return spawnSync(cmd, ["-version"], { stdio: "pipe" }).status === 0; } catch { return false; }
  };
  const tryWhich = (cmd: string) => {
    try {
      const bin = process.platform === "win32" ? "where" : "which";
      const r = spawnSync(bin, [cmd], { stdio: "pipe" });
      return r.status === 0;
    } catch { return false; }
  };
  return tryCmd("ffmpeg") || tryCmd("ffmpeg.exe") || tryWhich("ffmpeg");
}

function scanHeadersBackend(root: string){
  const files = rglob(root, new Set([".py",".ps1",".psm1",".mjs",".js",".ts",".md",".surql"]));
  const missing: string[] = [];
  for (const f of files){ if (!HEADER_RE.test(read(f))) missing.push(f); }
  return missing;
}
function checkBackendDirs(root: string){
  const res: Record<string, boolean> = {};
  for (const rel of BACKEND_REQUIRED_DIRS) {
    res[rel] = exists(path.join(root, ...rel.split("/")));
  }
  return res;
}
function checkBackendModels(root: string){
  const modelsDir = path.join(root, "models");
  let present: string[] = [];
  try{present=fs.readdirSync(modelsDir).map(String);}catch{}
  return {
    present,
    flags: {
      azr:   present.some(n=>n.includes("Absolute_Zero_Reasoner")),
      phi3:  present.some(n=>n.toLowerCase().includes("phi3")),
      gemma: present.some(n=>n.toLowerCase().includes("gemma")),
      llama: present.some(n=>n.toLowerCase().includes("llama")),
      voice: present.some(n=>n.toLowerCase().includes("voice")),
    }
  };
}
function checkBackendCheckpoints(root: string){
  const base = path.join(root,"checkpoints");
  const layout = {
    converter: ["checkpoint.pth","config.json"],
    EN:        ["checkpoint.pth","config.json","en_default_se.pth","en_style_se.pth"],
    ZH:        ["checkpoint.pth","config.json","zh_default_se.pth"],
  } as const;
  const found: Record<string,Record<string,boolean>> = {};
  for (const k of Object.keys(layout)){
    const dir = k==="converter"
      ? path.join(base, "converter")
      : k==="EN"
        ? path.join(base, "base_speakers", "EN")
        : path.join(base, "base_speakers", "ZH");
    const res: Record<string,boolean> = {};
    for (const f of (layout as any)[k]) res[f] = exists(path.join(dir, f));
    found[k] = res;
  }
  return found;
}
function checkBackendRequirements(root: string){
  const p = path.join(root,"requirements.txt");
  let text = ""; try{text=fs.readFileSync(p,"utf8");}catch{}
  const present: string[] = []; const missing: string[] = [];
  for (const pkg of REQUIRED_PY_PKGS){
    const rx = new RegExp(`^${pkg}(\\W|$)`,"im");
    if (rx.test(text)) present.push(pkg); else missing.push(pkg);
  }
  return { present, missing };
}
function auditBackend(root: string){
  return {
    root,
    dirs: checkBackendDirs(root),
    headers_missing: scanHeadersBackend(root),
    models: checkBackendModels(root),
    checkpoints: checkBackendCheckpoints(root),
    requirements: checkBackendRequirements(root),
    ffmpeg_available: haveFfmpeg(),
    config: { strict: strict ? String(strict) : "" }
  };
}

// ---------- CI / Strict ----------
function summarizeFailures(rept: any){
  const fails: string[] = [];
  if (rept.frontend){
    const f = rept.frontend;
    if (f.headers_missing?.length) fails.push(`[frontend] missing headers: ${f.headers_missing.length}`);
    if (Object.keys(f.duplicate_ids ?? {}).length) fails.push(`[frontend] duplicate IDs in ${Object.keys(f.duplicate_ids).length} file(s)`);
    const missRA = Object.entries(f.required_assets ?? {}).filter(([,ok])=>!ok).map(([k])=>k);
    if (missRA.length) fails.push(`[frontend] missing required assets: ${missRA.join(", ")}`);
    const missDA = Object.entries(f.discovered_assets ?? {}).filter(([,ok])=>!ok).map(([k])=>k);
    if (missDA.length) fails.push(`[frontend] missing discovered assets: ${missDA.slice(0,6).join(", ")}${missDA.length>6?` (+${missDA.length-6})`:""}`);
  }
  if (rept.backend){
    const b = rept.backend;
    const missDirs = Object.entries(b.dirs ?? {}).filter(([,ok])=>!ok).map(([k])=>k);
    if (missDirs.length) fails.push(`[backend] missing dirs: ${missDirs.join(", ")}`);
    if (b.headers_missing?.length) fails.push(`[backend] missing headers: ${b.headers_missing.length}`);
    const missPkgs = b.requirements?.missing ?? [];
    if (missPkgs.length) fails.push(`[backend] missing py pkgs: ${missPkgs.join(", ")}`);
    if (rept._ignoreFfmpeg !== true && b.ffmpeg_available === false) fails.push(`[backend] ffmpeg not available`);
    const chk = b.checkpoints ?? {};
    for (const k of Object.keys(chk)){
      const need = Object.entries(chk[k]).filter(([,ok])=>!ok).map(([f])=>f);
      if (need.length) fails.push(`[backend] checkpoints:${k} missing ${need.join(", ")}`);
    }
  }
  return fails;
}

// ---------- HTML report ----------
function writeHtmlReport(outPath: string, f: any, b: any){
  const safeList = (arr?: string[]) => (arr && arr.length) ? `<ul>${arr.map(x=>`<li>${x}</li>`).join("")}</ul>` : "<p>None ✅</p>";
  const listKV = (obj: Record<string,boolean>) => {
    const bad = Object.entries(obj||{}).filter(([,ok])=>!ok).map(([k])=>k);
    return bad.length ? bad : [];
  };
  const feMissingHdrs = (f?.headers_missing||[]) as string[];
  const feDupFiles    = Object.keys(f?.duplicate_ids||{});
  const feMissingReq  = listKV(f?.required_assets||{});
  const feMissingDisc = listKV(f?.discovered_assets||{});
  const beMissingHdrs = (b?.headers_missing||[]) as string[];
  const beMissingDirs = Object.entries(b?.dirs||{}).filter(([,ok])=>!ok).map(([k])=>k);
  const beMissingPkgs = (b?.requirements?.missing||[]) as string[];
  const beFfmpeg      = b?.ffmpeg_available === false ? ["ffmpeg not available"] : [];
  const beChk: string[] = [];
  for (const k of Object.keys(b?.checkpoints||{})){
    const need = Object.entries(b.checkpoints[k]).filter(([,ok])=>!ok).map(([kk])=>kk);
    if (need.length) beChk.push(`${k}: ${need.join(", ")}`);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>LEEWAY Audit Report</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:24px;line-height:1.5}
  h1{margin:0 0 8px} h2{margin-top:24px;border-bottom:1px solid #eee;padding-bottom:4px}
  h3{margin-top:16px} table{border-collapse:collapse;width:100%;margin:8px 0}
  td,th{border:1px solid #e5e7eb;padding:6px 8px;font-size:14px;vertical-align:top}
  .ok{color:#16a34a}.bad{color:#dc2626}.pill{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;margin:2px 6px 2px 0}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
</style></head><body>
<h1>LEEWAY Audit Report</h1>
<div class="mono">Generated: ${new Date().toISOString()}</div>

<h2>Frontend</h2>
<div class="grid">
  <div><h3>Missing Headers</h3>${safeList(feMissingHdrs)}</div>
  <div><h3>Files with Duplicate IDs</h3>${
    feDupFiles.length ? `<ul>${feDupFiles.map((fpf: string)=>{
      const ids = f.duplicate_ids[fpf]||{}; const ln = f.duplicate_ids_lines?.[fpf]||{};
      const inner = Object.keys(ids).map(id=>`<div class="pill">${id} ×${ids[id]} @ ${(ln[id]||[]).join(", ")}</div>`).join("");
      return `<li><strong>${fpf}</strong><div>${inner||"—"}</div></li>`;
    }).join("")}</ul>` : "<p>None ✅</p>"
  }</div>
</div>
<div class="grid">
  <div><h3>Missing Required Assets</h3>${safeList(feMissingReq)}</div>
  <div><h3>Missing Discovered Assets</h3>${safeList(feMissingDisc)}</div>
</div>

<h2>Backend</h2>
<div class="grid">
  <div><h3>Missing Headers</h3>${safeList(beMissingHdrs)}</div>
  <div><h3>Missing Dirs</h3>${safeList(beMissingDirs)}</div>
</div>
<div class="grid">
  <div><h3>Missing Python Packages</h3>${safeList(beMissingPkgs)}</div>
  <div><h3>Checkpoints Missing</h3>${safeList(beChk)}${beFfmpeg.length?`<p class="bad">FFmpeg: not available</p>`:`<p class="ok">FFmpeg: available</p>`}</div>
</div>
</body></html>`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath}`);
}

// ---------- Runner ----------
function run(){
  const out: any = {};
  if (mode==="frontend" || mode==="all") {
    out.frontend = auditFrontend(FRONTEND_ROOT);
    writeJSON(path.join(FRONTEND_ROOT,"run","leeway_frontend_audit_report.json"), out.frontend);
  }
  if (mode==="backend" || mode==="all") {
    out.backend = auditBackend(BACKEND_ROOT);
    writeJSON(path.join(BACKEND_ROOT,"run","leeway_audit_report.json"), out.backend);
  }
  out._ignoreFfmpeg = ignoreFfmpeg;

  if (reportHtml) {
    const outHtml = path.join(BACKEND_ROOT, "run", "leeway_audit_report.html");
    writeHtmlReport(outHtml, out.frontend, out.backend);
  }

  console.log(JSON.stringify(out,null,2));

  if (strict && ((strict==="all")||(strict==="frontend"&&out.frontend)||(strict==="backend"&&out.backend))){
    const fails = summarizeFailures(strict==="frontend"?{frontend:out.frontend,_ignoreFfmpeg:ignoreFfmpeg}:strict==="backend"?{backend:out.backend,_ignoreFfmpeg:ignoreFfmpeg}:out);
    if (fails.length){ console.error("❌ LEEWAY AUDIT FAIL\n" + fails.map(s=>" - "+s).join("\n")); process.exitCode = 1; }
    else { console.log("✅ LEEWAY AUDIT PASS"); }
  }
}

export const LeewayAudit = { run, auditFrontend, auditBackend };
export default LeewayAudit;
if (require.main === module) run();
