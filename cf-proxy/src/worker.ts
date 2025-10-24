/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: worker.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\cf-proxy\src\worker.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// Minimal Cloudflare Worker type shims (avoid external type deps)
interface KVNamespace {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  get(key: string): Promise<string | null>;
}
interface ScheduledEvent {
  // timestamp, etc. not needed for this worker
}

type Env = {
  ALLOW_ORIGIN: string;
  LIGHTNING_BASE: string;
  LIGHTNING_TOKEN?: string;
  GEMINI_API_KEY?: string;
  FALLBACK_BASE?: string;
  ADMIN_WEBHOOK?: string;
  STATUS_KV?: KVNamespace;
};

export default {
  // Cron health check: update KV with GPU health + RTT
  async scheduled(_event: ScheduledEvent, env: Env) {
    if (!env.STATUS_KV || !env.LIGHTNING_BASE) return;
    const t0 = Date.now();
    let ok = false;
    try {
      const r = await fetch(env.LIGHTNING_BASE.replace(/\/$/, '') + '/v1/models', { method: 'GET' });
      ok = r.ok;
    } catch {}
    const ms = Date.now() - t0;
    await env.STATUS_KV.put('gpu_ok', ok ? '1' : '0', { expirationTtl: 600 });
    await env.STATUS_KV.put('gpu_rtt_ms', String(ms), { expirationTtl: 600 });
    if (!ok && env.ADMIN_WEBHOOK) {
      try {
        await fetch(env.ADMIN_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `⚠️ Lightning primary unhealthy. RTT=${ms}ms. Routing to fallback.` }),
        });
      } catch {}
    }
  },

  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowCSV = env.ALLOW_ORIGIN || 'https://<your-username>.github.io';
    const allow = allowCSV.split(',').map(s => s.trim()).filter(Boolean);
    const ok = allow.some(o => origin.startsWith(o));

    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allow[0] || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    } as Record<string,string>;

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Ops metrics: expose last health sample
    if (url.pathname === '/ops/metrics') {
      const rtt = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_rtt_ms')) ?? 'NA' : 'NA';
      const healthy = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_ok')) === '1' : undefined;
      return new Response(JSON.stringify({ ok: healthy, rtt }), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // Policy-aware chat proxy: /api/chat -> {base}/v1/chat/completions
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const policy = (url.searchParams.get('policy') || 'FAST').toUpperCase();
      // Simple policy chooser; extend as needed
      const healthy = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_ok')) === '1' : true;
      let base = env.LIGHTNING_BASE;
      if (!healthy && env.FALLBACK_BASE) base = env.FALLBACK_BASE;
      // Optionally map CHEAP/LONG to different bases if provided via vars
      if (policy === 'CHEAP' && env.FALLBACK_BASE) base = env.FALLBACK_BASE;
      if (!base) return new Response(JSON.stringify({ error: 'No backend configured' }), { status: 500, headers: cors });
      const target = base.replace(/\/$/, '') + '/v1/chat/completions' + (url.search || '');
      const headers = new Headers(req.headers);
      headers.set('origin', new URL(base).origin);
      if (env.LIGHTNING_TOKEN) headers.set('Authorization', `Bearer ${env.LIGHTNING_TOKEN}`);
      const r = await fetch(target, { method: 'POST', headers, body: req.body, redirect: 'follow' });
      const h = new Headers(r.headers);
      cors['Content-Type'] = h.get('Content-Type') || 'application/json';
      // Pass through SSE if upstream streams
      return new Response(r.body, { status: r.status, headers: cors });
    }

    // Route: /gemini (JSON body: { model, input })
    if (url.pathname === '/gemini' && req.method === 'POST') {
      if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY' }), { status: 500, headers: cors });
      try {
        const { model = 'models/gemini-1.5-flash', input } = await req.json();
        const gUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
        const r = await fetch(gUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input ?? { contents: [] }) });
        return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors });
      }
    }

    // Route: /lightning/* -> proxy to env.LIGHTNING_BASE (e.g., https://<studio>:8000)
    if (url.pathname.startsWith('/lightning/')) {
      if (!env.LIGHTNING_BASE) return new Response(JSON.stringify({ error: 'Missing LIGHTNING_BASE' }), { status: 500, headers: cors });
      const target = env.LIGHTNING_BASE.replace(/\/$/, '') + url.pathname.replace('/lightning', '') + (url.search || '');
      const headers = new Headers(req.headers);
      headers.set('origin', new URL(env.LIGHTNING_BASE).origin);
      if (env.LIGHTNING_TOKEN) headers.set('Authorization', `Bearer ${env.LIGHTNING_TOKEN}`);
      const init: RequestInit = { method: req.method, headers, body: req.body, redirect: 'follow' };
      const r = await fetch(target, init);
      const h = new Headers(r.headers);
      cors['Content-Type'] = h.get('Content-Type') || 'application/json';
      return new Response(r.body, { status: r.status, headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
  },
};
