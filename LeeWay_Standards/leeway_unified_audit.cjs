/* LEEWAY HEADER — DO NOT REMOVE
REGION: QA.CHECKS.UNIFIED_AUDIT.V6_UNIVERSAL
5WH: WHAT=Universal LEEWAY standards audit with auto-bootstrap;
WHY=Enable LEEWAY adoption across any project type;
WHO=Universal (any codebase); WHERE=leeway_unified_audit.cjs;
WHEN=2025-01-28; HOW=Auto-detect structure, configurable requirements
SPDX-License-Identifier: MIT
*/

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// FS helpers (need to be defined before use)
const exists = fp=>{try{fs.accessSync(fp);return true;}catch{return false;}};
const read = fp=>{try{return fs.readFileSync(fp,"utf8");}catch{return "";}};
function writeJSON(fp,obj){fs.mkdirSync(path.dirname(fp),{recursive:true});fs.writeFileSync(fp,JSON.stringify(obj,null,2),"utf8");}
function writeText(fp, text) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, text, "utf8");
}
function rglob(root, exts){const out=[];(function walk(d){let ents;try{ents=fs.readdirSync(d,{withFileTypes:true});}catch{return;}for(const e of ents){const fp=path.join(d,e.name);if(e.isDirectory()) walk(fp); else if(e.isFile() && exts.has(path.extname(fp).toLowerCase())) out.push(fp);}})(root);return out;}

// Roots - auto-detect project structure
const REPO_ROOT = process.env.GITHUB_WORKSPACE || process.cwd();

// Auto-detect frontend root (try common patterns)
function detectFrontendRoot() {
  const candidates = [
    process.env.LW_FRONTEND_ROOT,
    "frontend", "src", "client", "web", "app", "."
  ].filter(Boolean);
  
  for (const candidate of candidates) {
    const testPath = path.resolve(REPO_ROOT, candidate);
    if (exists(testPath)) {
      // Check if it looks like a frontend project
      const hasReact = exists(path.join(testPath, "package.json")) && 
                     read(path.join(testPath, "package.json")).includes('"react"');
      const hasVite = exists(path.join(testPath, "vite.config.ts")) || 
                     exists(path.join(testPath, "vite.config.js"));
      const hasTsConfig = exists(path.join(testPath, "tsconfig.json"));
      
      if (hasReact || hasVite || hasTsConfig || candidate === ".") {
        return testPath;
      }
    }
  }
  return path.resolve(REPO_ROOT, "."); // fallback to root
}

// Auto-detect backend root (try common patterns)
function detectBackendRoot() {
  const candidates = [
    process.env.LW_BACKEND_ROOT,
    "backend", "server", "api", "services"
  ].filter(Boolean);
  
  for (const candidate of candidates) {
    const testPath = path.resolve(REPO_ROOT, candidate);
    if (exists(testPath)) {
      return testPath;
    }
  }
  return path.resolve(REPO_ROOT, "backend"); // standard fallback
}

const FRONTEND_ROOT = detectFrontendRoot();
const BACKEND_ROOT = detectBackendRoot();

// Requirements - configurable per project type
// These can be overridden via environment variables or config files
const FRONTEND_REQUIRED_IMAGES = (process.env.LW_REQUIRED_IMAGES || "").split(",").filter(Boolean);
const BACKEND_REQUIRED_DIRS = (process.env.LW_REQUIRED_DIRS || "").split(",").filter(Boolean);
const REQUIRED_PY_PKGS = (process.env.LW_REQUIRED_PACKAGES || "").split(",").filter(Boolean);

const HEADER_RE = /LEEWAY HEADER|LEEWAY MICRO:/m;
const DUPLICATE_ID_RE = /id=["']([^"']+)["']/g;
const IMG_REF_RE = new RegExp(
  String.raw`(?:(?:src|href)\s*=\s*["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']|import\s+[^'"]+\s+from\s+["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']|["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["'])`,
  "ig"
);

// CLI
const mode = (["frontend","backend","all"].includes(process.argv[2]) ? process.argv[2] : "all");
function flag(name){const a=process.argv.find(x=>x===`--${name}`||x.startsWith(`--${name}=`)); if(!a) return null; if(a===`--${name}`) return true; const [,v]=a.split("="); return v??true;}
const strictArg = flag("strict") ?? flag("fail") ?? (process.env.LEEWAY_STRICT ? "all" : null);
const strict = strictArg===true?"all":(strictArg==="frontend"?"frontend":(strictArg==="backend"?"backend":(strictArg==="all"?"all":false)));
const ignoreFfmpeg = !!flag("no-ffmpeg");
const reportHtml   = !!flag("report-html");
const maxHeaderLines = Number(flag("max-header-lines") || 120);

/* from the standards: canonical settings + scaffolds */
const CANON = {
  vscodeSettings: `{
  /* LEEWAY HEADER — DO NOT REMOVE (RapidWebDevelop.com · LEEWAY · Leonard Lee · AGNOSTIC · EDGE_FIRST) */
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 600,
  "eslint.enable": true,
  "eslint.validate": ["javascript","javascriptreact","typescript","typescriptreact","html","json","yaml"],
  "editor.codeActionsOnSave": { "source.fixAll": true, "source.fixAll.eslint": true, "source.organizeImports": true },
  "javascript.implicitProjectConfig.checkJs": true
}
`,
  agentLeeConfig: `/* LEEWAY HEADER — DO NOT REMOVE (config shell; no secrets) */
window.AGENTLEE_CONFIG = {
  // Leave empty by default; Worker URL is produced by CI deploy and can be injected if desired.
  GEMINI_PROXY_URL: ""
};
`,
  cfWorkerTS: `export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow = ["https://<your-username>.github.io", "https://<your-username>.github.io/<your-repo>"];
    const ok = allow.some(o => origin.startsWith(o));
    if (req.method === "OPTIONS") return new Response(null, { headers: {
      "Access-Control-Allow-Origin": ok? origin : allow[0],
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary":"Origin" }});
    if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405});
    if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({error:"Missing GEMINI_API_KEY"}), {status:500});
    try {
      const { model = "models/gemini-1.5-flash", input } = await req.json();
      const url = \`https://generativelanguage.googleapis.com/v1beta/\${model}:generateContent?key=\${env.GEMINI_API_KEY}\`;
      const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(input ?? { contents: [] }) });
      return new Response(r.body, { status: r.status, headers: { "Content-Type":"application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin": ok? origin : allow[0], "Vary":"Origin" }});
    } catch(e) { return new Response(JSON.stringify({error: String(e?.message||e)}), {status:500}); }
  }
};
`,
  wranglerToml: `name = "agentlee-gemini-proxy"
main = "src/worker.ts"
compatibility_date = "2024-09-01"
`,
  deployWorkerYml: `name: Deploy Cloudflare Worker
on:
  push:
    branches: [ main ]
    paths: [ 'cf-proxy/**', '.github/workflows/deploy-worker.yml' ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g wrangler
      - name: Publish Worker
        working-directory: cf-proxy
        env:
          CF_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
        run: |
          echo "\${GEMINI_API_KEY}" | wrangler secret put GEMINI_API_KEY --yes
          wrangler publish
`
};

/* NEW: create standard files if absent (no secrets!) */
function ensureBootstrap() {
  const VS = path.join(REPO_ROOT, ".vscode", "settings.json");
  const PUB_CFG = path.join(REPO_ROOT, "public", "agentlee.config.js");
  const CF_DIR = path.join(REPO_ROOT, "cf-proxy");
  const CF_WRANGLER = path.join(CF_DIR, "wrangler.toml");
  const CF_WORKER = path.join(CF_DIR, "src", "worker.ts");
  const GH_WORK = path.join(REPO_ROOT, ".github", "workflows", "deploy-worker.yml");

  const created = {};
  if (!exists(VS)) { writeText(VS, CANON.vscodeSettings); created.VS = true; }
  if (!exists(PUB_CFG)) { writeText(PUB_CFG, CANON.agentLeeConfig); created.PUB_CFG = true; }
  if (!exists(CF_WRANGLER)) { writeText(CF_WRANGLER, CANON.wranglerToml); created.CF_WRANGLER = true; }
  if (!exists(CF_WORKER)) { writeText(CF_WORKER, CANON.cfWorkerTS); created.CF_WORKER = true; }
  if (!exists(GH_WORK)) { writeText(GH_WORK, CANON.deployWorkerYml); created.GH_WORK = true; }

  const missingSecrets = ["CF_API_TOKEN","CF_ACCOUNT_ID","GEMINI_API_KEY"].filter(k => !process.env[k]);
  return { created, missingSecrets };
}

// FRONTEND
function scanHeadersFrontend(root, n=120){
  const files=rglob(root,new Set([".tsx",".ts",".jsx",".js",".mjs",".html",".css",".md"]));
  const missing=[];
  for(const f of files){const t=read(f);const hay=n>0?t.split("\n").slice(0,n).join("\n"):t;if(!HEADER_RE.test(hay)) missing.push(f);}
  return missing.sort();
}
function scanDuplicateIds(root){
  const files=rglob(root,new Set([".html",".tsx",".jsx"]));
  const counts={};
  for(const f of files){
    const t=read(f); if(!t) continue;
    let m; const lc={};
    DUPLICATE_ID_RE.lastIndex=0;
    while((m=DUPLICATE_ID_RE.exec(t))){
      const id=m[1]; 
      lc[id]=(lc[id]??0)+1; 
    }
    const offenders=Object.fromEntries(Object.entries(lc).filter(([,c])=>c>1));
    if(Object.keys(offenders).length){counts[f]=offenders;}
  }
  return { duplicate_ids: counts, duplicate_ids_lines: {} };
}
function discoverImageRefs(root){
  const files=rglob(root,new Set([".tsx",".ts",".jsx",".js",".mjs",".html",".css",".md"]));
  const refs=new Set();
  for(const f of files){
    const t=read(f); if(!t) continue;
    let m; IMG_REF_RE.lastIndex=0;
    while((m=IMG_REF_RE.exec(t))){
      const rel=(m[1]||m[2]||m[3]||"").replace(/^(\.\/|\/)/,"");
      if(/\.(png|jpe?g|gif|svg|webp)$/i.test(rel)) refs.add(rel);
    }
  }
  return Array.from(refs).sort();
}
function checkAssets(publicDir, rels){
  const res={}; 
  // Only check assets if we have some to check and public dir exists
  if (rels.length > 0 && exists(publicDir)) {
    for(const r of rels) res[r]=exists(path.join(publicDir,r)); 
  }
  return res;
}
function auditFrontend(root){
  const headers_missing=scanHeadersFrontend(root, maxHeaderLines);
  const {duplicate_ids,duplicate_ids_lines}=scanDuplicateIds(root);
  const discovered=discoverImageRefs(root);
  
  // Try to find public directory (could be public/, static/, assets/, etc.)
  const publicDirCandidates = ["public", "static", "assets", "dist"];
  let publicDir = null;
  for (const candidate of publicDirCandidates) {
    const testPath = path.join(root, candidate);
    if (exists(testPath)) {
      publicDir = testPath;
      break;
    }
  }
  
  const required_assets = publicDir ? checkAssets(publicDir, FRONTEND_REQUIRED_IMAGES) : {};
  const discovered_assets = publicDir ? checkAssets(publicDir, discovered) : {};
  
  return {
    headers_missing, duplicate_ids, duplicate_ids_lines, required_assets, discovered_assets, root,
    public_dir: publicDir,
    config:{strict: strict?String(strict):"", format:"json", max_header_lines:String(maxHeaderLines), workers:"node:sync", ignore_file:""}
  };
}

// BACKEND
function haveFfmpeg(){
  const tryCmd = cmd => { try { return spawnSync(cmd, ["-version"], { stdio: "pipe" }).status === 0; } catch { return false; } };
  const tryWhich = cmd => { try { const bin = process.platform === "win32" ? "where" : "which"; return spawnSync(bin,[cmd],{stdio:"pipe"}).status===0; } catch { return false; } };
  return tryCmd("ffmpeg") || tryCmd("ffmpeg.exe") || tryWhich("ffmpeg");
}
function scanHeadersBackend(root){
  const files=rglob(root,new Set([".py",".ps1",".psm1",".mjs",".js",".ts",".md",".surql"])); const missing=[];
  for(const f of files){ if(!HEADER_RE.test(read(f))) missing.push(f); } return missing;
}
function checkBackendDirs(root){
  const res={};
  // Only check dirs if they're actually required
  if (BACKEND_REQUIRED_DIRS.length > 0) {
    for(const rel of BACKEND_REQUIRED_DIRS){ 
      res[rel] = exists(path.join(root, ...rel.split("/"))); 
    }
  }
  return res;
}
function checkBackendModels(root){
  const models=path.join(root,"models"); let present=[]; try{present=fs.readdirSync(models).map(String);}catch{}
  return { present, flags:{
    azr:present.some(n=>n.includes("Absolute_Zero_Reasoner")),
    phi3:present.some(n=>n.toLowerCase().includes("phi3")),
    gemma:present.some(n=>n.toLowerCase().includes("gemma")),
    llama:present.some(n=>n.toLowerCase().includes("llama")),
    voice:present.some(n=>n.toLowerCase().includes("voice")),
  }};
}
function checkBackendCheckpoints(root){
  const base=path.join(root,"checkpoints");
  const req={converter:["checkpoint.pth","config.json"], EN:["checkpoint.pth","config.json","en_default_se.pth","en_style_se.pth"], ZH:["checkpoint.pth","config.json","zh_default_se.pth"]};
  const found={};
  for(const k of Object.keys(req)){
    const dir=k==="converter"?path.join(base,"converter"):k==="EN"?path.join(base,"base_speakers","EN"):path.join(base,"base_speakers","ZH");
    const res={}; for(const f of req[k]) res[f]=exists(path.join(dir,f)); found[k]=res;
  }
  return found;
}
function checkBackendRequirements(root){
  const p=path.join(root,"requirements.txt"); 
  let text=""; 
  try{text=fs.readFileSync(p,"utf8");}catch{}
  
  const present=[], missing=[];
  // Only check packages if they're actually required
  if (REQUIRED_PY_PKGS.length > 0) {
    for(const pkg of REQUIRED_PY_PKGS){
      const rx=new RegExp(`^${pkg}(\\W|$)`,"im"); 
      if(rx.test(text)) present.push(pkg); 
      else missing.push(pkg);
    }
  }
  return {present, missing, requirements_file_exists: text.length > 0};
}
function auditBackend(root){
  return { root, dirs:checkBackendDirs(root), headers_missing:scanHeadersBackend(root), models:checkBackendModels(root),
           checkpoints:checkBackendCheckpoints(root), requirements:checkBackendRequirements(root),
           ffmpeg_available:haveFfmpeg(), config:{strict: strict?String(strict):""}};
}

// CI / Strict
function summarizeFailures(rept){
  const fails=[];
  if(rept.frontend){
    const f=rept.frontend;
    if(f.headers_missing?.length) fails.push(`[frontend] missing headers: ${f.headers_missing.length}`);
    if(Object.keys(f.duplicate_ids??{}).length) fails.push(`[frontend] duplicate IDs in ${Object.keys(f.duplicate_ids).length} file(s)`);
    const missRA=Object.entries(f.required_assets??{}).filter(([,ok])=>!ok).map(([k])=>k);
    if(missRA.length) fails.push(`[frontend] missing required assets: ${missRA.join(", ")}`);
    const missDA=Object.entries(f.discovered_assets??{}).filter(([,ok])=>!ok).map(([k])=>k);
    if(missDA.length) fails.push(`[frontend] missing discovered assets: ${missDA.slice(0,6).join(", ")}${missDA.length>6?` (+${missDA.length-6})`:""}`);
  }
  if(rept.backend){
    const b=rept.backend;
    const missDirs=Object.entries(b.dirs??{}).filter(([,ok])=>!ok).map(([k])=>k);
    if(missDirs.length) fails.push(`[backend] missing dirs: ${missDirs.join(", ")}`);
    if(b.headers_missing?.length) fails.push(`[backend] missing headers: ${b.headers_missing.length}`);
    const missPkgs=b.requirements?.missing??[];
    if(missPkgs.length) fails.push(`[backend] missing py pkgs: ${missPkgs.join(", ")}`);
    if(rept._ignoreFfmpeg!==true && b.ffmpeg_available===false) fails.push(`[backend] ffmpeg not available`);
    const chk=b.checkpoints??{};
    for(const k of Object.keys(chk)){
      const need=Object.entries(chk[k]).filter(([,ok])=>!ok).map(([f])=>f);
      if(need.length) fails.push(`[backend] checkpoints:${k} missing ${need.join(", ")}`);
    }
  }
  return fails;
}

// HTML report
function writeHtmlReport(outPath, f, b){
  const safeList = arr => (arr && arr.length) ? `<ul>${arr.map(x=>`<li>${x}</li>`).join("")}</ul>` : "<p>None ✅</p>";
  const listKV = obj => { const bad=Object.entries(obj||{}).filter(([,ok])=>!ok).map(([k])=>k); return bad.length?bad:[]; };
  const feMissingHdrs=(f?.headers_missing||[]), feDupFiles=Object.keys(f?.duplicate_ids||{});
  const feMissingReq=listKV(f?.required_assets||{}), feMissingDisc=listKV(f?.discovered_assets||{});
  const beMissingHdrs=(b?.headers_missing||[]), beMissingDirs=Object.entries(b?.dirs||{}).filter(([,ok])=>!ok).map(([k])=>k);
  const beMissingPkgs=(b?.requirements?.missing||[]), beFfmpeg=b?.ffmpeg_available===false?["ffmpeg not available"]:[];
  const beChk=[]; for(const k of Object.keys(b?.checkpoints||{})){const need=Object.entries(b.checkpoints[k]).filter(([,ok])=>!ok).map(([kk])=>kk); if(need.length) beChk.push(`${k}: ${need.join(", ")}`);}
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>LEEWAY Audit Report</title>
<style>
body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:24px;line-height:1.5}
h1{margin:0 0 8px} h2{margin-top:24px;border-bottom:1px solid #eee;padding-bottom:4px}
h3{margin-top:16px} table{border-collapse:collapse;width:100%;margin:8px 0}
td,th{border:1px solid #e5e7eb;padding:6px 8px;font-size:14px;vertical-align:top}
.ok{color:#16a34a}.bad{color:#dc2626}.pill{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;margin:2px 6px 2px 0}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
</style></head><body>
<h1>LEEWAY Audit Report</h1><div class="mono">Generated: ${new Date().toISOString()}</div>
<h2>Frontend</h2>
<div class="grid"><div><h3>Missing Headers</h3>${safeList(feMissingHdrs)}</div>
<div><h3>Files with Duplicate IDs</h3>${
  feDupFiles.length?`<ul>${feDupFiles.map(fpf=>{
    const ids=f.duplicate_ids[fpf]||{}; const ln=f.duplicate_ids_lines?.[fpf]||{};
    const inner=Object.keys(ids).map(id=>`<div class="pill">${id} ×${ids[id]} @ ${(ln[id]||[]).join(", ")}</div>`).join("");
    return `<li><strong>${fpf}</strong><div>${inner||"—"}</div></li>`;
  }).join("")}</ul>`:"<p>None ✅</p>"
}</div></div>
<div class="grid"><div><h3>Missing Required Assets</h3>${safeList(feMissingReq)}</div>
<div><h3>Missing Discovered Assets</h3>${safeList(feMissingDisc)}</div></div>
<h2>Backend</h2>
<div class="grid"><div><h3>Missing Headers</h3>${safeList(beMissingHdrs)}</div>
<div><h3>Missing Dirs</h3>${safeList(beMissingDirs)}</div></div>
<div class="grid"><div><h3>Missing Python Packages</h3>${safeList(beMissingPkgs)}</div>
<div><h3>Checkpoints Missing</h3>${safeList(beChk)}${beFfmpeg.length?`<p class="bad">FFmpeg: not available</p>`:`<p class="ok">FFmpeg: available</p>`}</div></div>
</body></html>`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath}`);
}

// Runner
function run(){
  const boot = ensureBootstrap(); // <-- NEW
  const out={ _bootstrap: boot };

  // Smart project detection - if frontend and backend are the same (root project), only audit once
  const isSingleProject = FRONTEND_ROOT === BACKEND_ROOT;
  
  if(mode==="frontend"||mode==="all"){
    out.frontend=auditFrontend(FRONTEND_ROOT);
    const reportDir = path.join(FRONTEND_ROOT, "run");
    fs.mkdirSync(reportDir, { recursive: true });
    writeJSON(path.join(reportDir,"leeway_frontend_audit_report.json"),out.frontend);
  }
  
  if((mode==="backend"||mode==="all") && !isSingleProject){
    out.backend=auditBackend(BACKEND_ROOT);
    const reportDir = path.join(BACKEND_ROOT, "run");
    fs.mkdirSync(reportDir, { recursive: true });
    writeJSON(path.join(reportDir,"leeway_audit_report.json"),out.backend);
  }

  out._ignoreFfmpeg=ignoreFfmpeg;
  if(reportHtml){
    const reportDir = isSingleProject ? path.join(FRONTEND_ROOT, "run") : path.join(BACKEND_ROOT, "run");
    fs.mkdirSync(reportDir, { recursive: true });
    const outHtml=path.join(reportDir,"leeway_audit_report.html");
    writeHtmlReport(outHtml,out.frontend,out.backend);
  }
  console.log(JSON.stringify(out,null,2));

  /* hard fail if standards can't be honored due to secrets (strict only) */
  if (strict && boot.missingSecrets.length) {
    console.error("❌ LEEWAY: missing required secrets in CI: " + boot.missingSecrets.join(", "));
    process.exitCode = 1; return;
  }

  if(strict && ((strict==="all")||(strict==="frontend"&&out.frontend)||(strict==="backend"&&out.backend))){
    const fails=summarizeFailures(strict==="frontend"?{frontend:out.frontend,_ignoreFfmpeg:ignoreFfmpeg}:strict==="backend"?{backend:out.backend,_ignoreFfmpeg:ignoreFfmpeg}:out);
    if(fails.length){console.error("❌ LEEWAY AUDIT FAIL\n"+fails.map(s=>" - "+s).join("\n"));process.exitCode=1;} else {console.log("✅ LEEWAY AUDIT PASS");}
  }
}
module.exports = { LeewayAudit: { run, auditFrontend, auditBackend } };
if (require.main === module) run();
