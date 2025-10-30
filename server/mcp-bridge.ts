/* LEEWAY HEADER
TAG: SERVER.MCP.BRIDGE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: cable
ICON_SIG: CD534113
5WH: WHAT=Local REST bridge to Android/Windows MCP; WHY=Safe browser→OS control;
WHO=Leeway Core; WHERE=server/mcp-bridge.ts; WHEN=2025-10-28; HOW=Node/Express
SPDX-License-Identifier: MIT
*/
import { spawn } from 'child_process';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import http from 'node:http';
import os from 'node:os';
import { parseStringPromise } from 'xml2js';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'] }));

// ---------- UTILS ----------
function run(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<{ code: number; stdout: string; stderr: string }>
{
  const timeoutMs = opts.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: os.platform() === 'win32' });
    let stdout = '', stderr = '';
    const to = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error(`Timeout ${cmd} ${args.join(' ')}`));
    }, timeoutMs);
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('close', code => {
      clearTimeout(to);
      resolve({ code: code ?? -1, stdout, stderr });
    });
    child.on('error', reject);
  });
}

// Binary stdout variant (for screenshots)
function runBuffer(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<{ code: number; stdout: Buffer; stderr: string }>
{
  const timeoutMs = opts.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: os.platform() === 'win32' });
    const chunks: Buffer[] = [];
    let stderr = '';
    const to = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error(`Timeout ${cmd} ${args.join(' ')}`));
    }, timeoutMs);
    child.stdout.on('data', d => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(String(d))));
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('close', code => {
      clearTimeout(to);
      resolve({ code: code ?? -1, stdout: Buffer.concat(chunks), stderr });
    });
    child.on('error', reject);
  });
}

function sanitizeName(s: string) {
  // allow letters, digits, space, dot, dash, underscore
  if (!/^[\w.\-\s]{1,80}$/.test(s)) throw new Error('Invalid name');
  return s;
}

function sanitizePackage(s: string) {
  // Android package like com.vendor.app OR activity
  if (!/^[a-zA-Z0-9._\-]{1,120}(\/[A-Za-z0-9._$]+)?$/.test(s)) throw new Error('Invalid package/activity');
  return s;
}

// ---------- CONFIG / VERSION / HTTP BASES ----------
const VERSION = '0.3.1';
const START_PORT = Number(process.env.MCP_BRIDGE_PORT || 5176);
const HOST = process.env.MCP_BRIDGE_HOST || '127.0.0.1';
const PHONE_HTTP_BASE = process.env.PHONE_MCP_HTTP_BASE || '';
const WINDOWS_HTTP_BASE = process.env.WINDOWS_MCP_HTTP_BASE || '';

async function tryHttpJSON<T>(url: string, options?: any): Promise<T | null> {
  try {
    const r = await fetch(url, { ...(options || {}), timeout: 15000 as any });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// Health and capability endpoints
app.get('/healthz', (_req: Request, res: Response) => res.json({ ok: true, version: VERSION }));
app.get('/_capabilities', async (_req: Request, res: Response) => {
  const ok = (x: any) => !!x;
  const httpProbe = async (base?: string) => base ? ok(await tryHttpJSON(`${base}/healthz`).catch(() => null)) : false;
  const adbOk = await run('adb', ['version']).then(r => r.code === 0).catch(() => false);
  const phoneCliOk = await run('phone-cli', ['--help']).then(r => r.code === 0).catch(() => false);
  const winCliOk = await run('windows-cli', ['--help']).then(r => r.code === 0).catch(() => false);
  res.json({ ok: true, caps: {
    adb: adbOk,
    'phone-cli': phoneCliOk,
    'phone-http': await httpProbe(PHONE_HTTP_BASE),
    'windows-cli': winCliOk,
    'windows-http': await httpProbe(WINDOWS_HTTP_BASE),
    powershell: true
  }, http: { PHONE_HTTP_BASE, WINDOWS_HTTP_BASE } });
});

// ---------- ANDROID ----------
app.get('/android/apps', async (_req: Request, res: Response) => {
  try {
    // 1) HTTP MCP server
    if (PHONE_HTTP_BASE) {
      const data = await tryHttpJSON<{ apps: string[] }>(`${PHONE_HTTP_BASE}/android/apps`);
      if (data?.apps?.length) return res.json({ source: 'phone-http', apps: data.apps });
    }
    // 2) Prefer phone-cli (from Phone MCP) if available, else adb pm list
    const tryPhoneCli = await run('phone-cli', ['list-apps']).catch(() => null as any);
    if (tryPhoneCli && tryPhoneCli.code === 0 && tryPhoneCli.stdout.trim()) {
  return res.json({ source: 'phone-cli', apps: tryPhoneCli.stdout.trim().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean) });
    }
    const adb = await run('adb', ['shell', 'pm', 'list', 'packages']);
    if (adb.code !== 0) throw new Error(adb.stderr || 'adb failed');
    const apps = adb.stdout.split('\n').map(l => l.replace(/^package:/, '').trim()).filter(Boolean);
    res.json({ source: 'adb', apps });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post('/android/launch', async (req: Request, res: Response) => {
  try {
    const pkg = sanitizePackage(String(req.body.package || req.body.name));
    // 1) HTTP MCP
    if (PHONE_HTTP_BASE) {
      const r = await tryHttpJSON<{ ok: boolean }>(`${PHONE_HTTP_BASE}/android/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg })
      });
      if (r?.ok) return res.json({ ok: true, via: 'phone-http' });
    }
    // 2) Try phone-cli first:
    const r = await run('phone-cli', ['app', pkg]).catch(() => null as any);
    if (r && r.code === 0) return res.json({ ok: true, via: 'phone-cli' });
    // Fallback: adb monkey (fire intent by package)
    const m = await run('adb', ['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1']);
    if (m.code === 0) return res.json({ ok: true, via: 'adb.monkey' });
    throw new Error(m.stderr || 'launch failed');
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post('/android/input/tap', async (req: Request, res: Response) => {
  try {
    const x = Math.max(0, Math.min(10000, Number(req.body.x)));
    const y = Math.max(0, Math.min(10000, Number(req.body.y)));
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid coordinates');
    const r = await run('adb', ['shell', 'input', 'tap', String(x), String(y)]);
    if (r.code !== 0) throw new Error(r.stderr);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Android find by text → tap
app.post('/android/find-tap', async (req: Request, res: Response) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) throw new Error('Missing {text}');
    // 1) HTTP MCP if present
    if (PHONE_HTTP_BASE) {
      const r = await tryHttpJSON<{ ok: boolean }>(`${PHONE_HTTP_BASE}/android/find-tap`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (r?.ok) return res.json({ ok: true, via: 'phone-http' });
    }
    // 2) ADB uiautomator dump fallback
    const dump = await run('adb', ['shell', 'uiautomator', 'dump']);
    if (dump.code !== 0) throw new Error(dump.stderr || 'uiautomator dump failed');
    const m = dump.stdout.match(/\/.*?\.xml/);
    const remotePath = m ? m[0] : '/sdcard/window_hierarchy.xml';
    const cat = await run('adb', ['shell', 'cat', remotePath]);
    if (cat.code !== 0) throw new Error(cat.stderr || 'unable to read dump xml');
    const xml = await parseStringPromise(cat.stdout);
    let hitBounds: string | null = null;
    function walk(node: any) {
      if (!node) return;
      const kids = ([] as any[]).concat(node.node || node.Node || []);
      const attrs = node.$ || {};
      const t = (attrs.text || attrs['content-desc'] || '').toString();
      if (!hitBounds && t.toLowerCase().includes(text.toLowerCase())) hitBounds = attrs.bounds || null;
      for (const k of kids) walk(k);
    }
    walk(xml?.hierarchy);
  if (!hitBounds) throw new Error(`No element containing "${text}"`);
  const hb = String(hitBounds);
  const mm = hb.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!mm) throw new Error(`Bad bounds: ${hitBounds}`);
    const [, x1, y1, x2, y2] = mm.map(Number);
    const cx = Math.round((x1 + x2) / 2);
    const cy = Math.round((y1 + y2) / 2);
    const tap = await run('adb', ['shell', 'input', 'tap', String(cx), String(cy)]);
    if (tap.code !== 0) throw new Error(tap.stderr || 'tap failed');
    res.json({ ok: true, tapped: { x: cx, y: cy }, via: 'adb.uiautomator' });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Android screenshot (PNG)
app.get('/android/screenshot', async (_req: Request, res: Response) => {
  try {
    const r = await runBuffer('adb', ['exec-out', 'screencap', '-p'], { timeoutMs: 15000 });
    if (r.code !== 0 || !r.stdout?.length) throw new Error(r.stderr || 'screencap failed');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(r.stdout);
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post('/android/input/text', async (req: Request, res: Response) => {
  try {
    const text = String(req.body.text ?? '');
    if (!text) throw new Error('Missing text');
    // Escape spaces for adb shell input text
    const escaped = text.replace(/ /g, '%s');
    const r = await run('adb', ['shell', 'input', 'text', escaped]);
    if (r.code !== 0) throw new Error(r.stderr);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---------- WINDOWS ----------
app.get('/windows/apps', async (_req: Request, res: Response) => {
  try {
    // HTTP MCP first
    if (WINDOWS_HTTP_BASE) {
      const data = await tryHttpJSON<{ apps: string[] }>(`${WINDOWS_HTTP_BASE}/windows/apps`);
      if (data?.apps?.length) return res.json({ source: 'windows-http', apps: data.apps });
    }
    // If windows-mcp exposes a CLI like windows-cli list-apps, try that first
    const cli = await run('windows-cli', ['list-apps']).catch(() => null as any);
    if (cli && cli.code === 0 && cli.stdout.trim()) {
      return res.json({ source: 'windows-cli', apps: cli.stdout.trim().split(/\r?\n/).filter(Boolean) });
    }
    // PowerShell fallback to enumerate installed programs (user-level + system)
    const ps = `Get-StartApps | Select-Object -ExpandProperty Name`;
    const r = await run('powershell', ['-NoProfile', '-Command', ps], { timeoutMs: 20000 });
    if (r.code !== 0) throw new Error(r.stderr);
    const apps = r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    res.json({ source: 'powershell', apps });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post('/windows/launch', async (req: Request, res: Response) => {
  try {
    const name = sanitizeName(String(req.body.name));
    // Prefer HTTP MCP
    if (WINDOWS_HTTP_BASE) {
      const r = await tryHttpJSON<{ ok: boolean }>(`${WINDOWS_HTTP_BASE}/windows/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (r?.ok) return res.json({ ok: true, via: 'windows-http' });
    }
    // Prefer windows-cli launch if present
    const cli = await run('windows-cli', ['launch', name]).catch(() => null as any);
    if (cli && cli.code === 0) return res.json({ ok: true, via: 'windows-cli' });

    // Fallback: Start-Process with shell execution (Start menu resolution)
    const ps = `Start-Process -FilePath "shell:AppsFolder\\${name}" -ErrorAction SilentlyContinue; if (!$?) { Start-Process "${name}" }`;
    const r = await run('powershell', ['-NoProfile', '-Command', ps]);
    if (r.code !== 0) throw new Error(r.stderr);
    res.json({ ok: true, via: 'powershell' });
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Windows screenshot (PNG via PowerShell)
app.get('/windows/screenshot', async (_req: Request, res: Response) => {
  try {
    const ps = `
Add-Type -AssemblyName System.Drawing
$sw = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($sw.Width, $sw.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($sw.Location, [System.Drawing.Point]::Empty, $sw.Size)
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
[Convert]::ToBase64String($ms.ToArray())
`;
    const r = await run('powershell', ['-NoProfile', '-STA', '-Command', ps], { timeoutMs: 15000 });
    if (r.code !== 0 || !r.stdout) throw new Error(r.stderr || 'screenshot failed');
    const png = Buffer.from(r.stdout.trim(), 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Example: Additional UI automation endpoints could be added here, proxying to a local MCP server.

// Attempt to bind, falling back to the next few ports if the preferred one is busy
function startServer(startPort: number, tries = 5) {
  return new Promise<void>((resolve, reject) => {
    let port = startPort;
    const server = http.createServer(app);
    const onError = (err: any) => {
      if (err?.code === 'EADDRINUSE' && tries > 1) {
        console.warn(`[mcp-bridge] Port ${port} in use, trying ${port + 1}…`);
        port += 1;
        tries -= 1;
        setTimeout(() => server.listen(port, HOST), 200);
        return;
      }
      reject(err);
    };
    server.once('error', onError);
    server.once('listening', () => {
      server.removeListener('error', onError);
      console.log(`[mcp-bridge] ${VERSION} on http://${HOST}:${port}`);
      if (port !== startPort) {
        console.log(`[mcp-bridge] Hint: set MCP_BRIDGE_PORT=${port} to pin this port.`);
      }
      resolve();
    });
    server.listen(port, HOST);
  });
}

startServer(START_PORT).catch((e) => {
  console.error(`[mcp-bridge] Failed to start:`, e?.message || e);
  process.exit(1);
});
