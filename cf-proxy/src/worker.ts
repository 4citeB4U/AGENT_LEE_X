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
  OPENAI_API_KEY?: string;
  VERCEL_HOOK?: string;
  FLY_HOOK?: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  FALLBACK_BASE?: string;
  ADMIN_WEBHOOK?: string;
  STATUS_KV?: KVNamespace;
  LOCAL_ONLY?: string; // 'true'|'false' optional server-side guard
};

type Policy = 'FAST' | 'CHEAP' | 'LONG';

const RL_WINDOW_S = 60;
const RL_MAX_PER_IP = 30;
const BUDGET_DAY_TOKENS = 100_000_000;

const MODEL_BY_POLICY = (env: Env): Record<Policy, string | undefined> => ({
  FAST: env.LIGHTNING_BASE,
  CHEAP: env.FALLBACK_BASE || env.LIGHTNING_BASE,
  LONG: env.LIGHTNING_BASE,
});

function dayKey(prefix: string, d = new Date()) {
  return `${prefix}_${d.toISOString().slice(0, 10)}`;
}

async function incrKV(env: Env, key: string, delta = 1, ttl?: number) {
  if (!env.STATUS_KV) return delta;
  const cur = Number((await env.STATUS_KV.get(key)) || '0');
  const val = cur + delta;
  await env.STATUS_KV.put(key, String(val), ttl ? { expirationTtl: ttl } : undefined);
  return val;
}

function matchOrigin(origin: string, pattern: string) {
  // Accept exact origins and wildcard subdomains like https://*.example.com
  try {
    const o = new URL(origin);
    const p = new URL(pattern.replace('*.', '')); // basic normalize
    const protoOk = o.protocol === p.protocol;
    if (pattern.includes('*.')) {
      const hostSuffix = p.host;
      const hostOk = o.host === hostSuffix || o.host.endsWith('.' + hostSuffix);
      return protoOk && hostOk;
    }
    // Allow prefix match for legacy entries that include path
    return origin.startsWith(pattern);
  } catch {
    // If pattern isn't a URL, fallback to prefix match
    return origin.startsWith(pattern);
  }
}

function buildCors(origin: string, env: Env) {
  const allowCSV = env.ALLOW_ORIGIN || 'https://<your-username>.github.io, https://*.github.io, https://*.vercel.app, https://*.pages.dev';
  const allow = allowCSV.split(',').map(s => s.trim()).filter(Boolean);
  const matched = allow.some(o => matchOrigin(origin, o));
  return {
    headers: {
      'Access-Control-Allow-Origin': matched ? origin : allow[0] || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    } as Record<string, string>,
    allow,
  };
}

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
    const { headers: cors } = buildCors(origin, env);
    const ua = req.headers.get('User-Agent') || '';
    const isDevice = /Mobile|Android|iPhone|iPad/i.test(ua);
    const localOnlyQuery = url.searchParams.get('localOnly');
    const localOnly = (localOnlyQuery ?? env.LOCAL_ONLY ?? 'false') === 'true';

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Apps status: which providers are wired (sanitized booleans only)
    if (url.pathname === '/apps/status') {
      const live = {
        lightning: !!env.LIGHTNING_BASE,
        gemini: !!env.GEMINI_API_KEY,
        openai: !!env.OPENAI_API_KEY,
        vercel: !!env.VERCEL_HOOK,
        fly: !!env.FLY_HOOK,
        cf: !!env.CF_API_TOKEN && !!env.CF_ACCOUNT_ID,
      };
      return new Response(JSON.stringify({ live }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Ops: sanitized config echo for diagnostics
    if (url.pathname === '/ops/config') {
      const cfg = {
        lightning: !!env.LIGHTNING_BASE,
        fallback: !!env.FALLBACK_BASE,
        gemini: !!env.GEMINI_API_KEY,
        openai: !!env.OPENAI_API_KEY,
        vercel: !!env.VERCEL_HOOK,
        fly: !!env.FLY_HOOK,
        cf: !!env.CF_API_TOKEN,
        kv: !!env.STATUS_KV,
        localOnly: localOnly,
      };
      return new Response(JSON.stringify(cfg), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // Ops metrics: expose last health sample
    if (url.pathname === '/ops/metrics') {
      const rtt = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_rtt_ms')) ?? 'NA' : 'NA';
      const healthy = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_ok')) === '1' : undefined;
      return new Response(JSON.stringify({ ok: healthy, rtt }), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // Optional origin-based rate limit (in addition to IP)
    if (origin) {
      const originKey = `rl_origin_${origin.replace(/^https?:\/\//,'').split('/')[0]}_${Math.floor(Date.now() / 1000 / RL_WINDOW_S)}`;
      const hits = await incrKV(env, originKey, 1, RL_WINDOW_S);
      if (env.STATUS_KV && hits > RL_MAX_PER_IP) {
        return new Response('Rate limit exceeded (origin)', { status: 429, headers: cors });
      }
    }

    // Device-safe intent relay (no secrets, no egress)
    if (isDevice && url.pathname === '/intent/relay' && req.method === 'POST') {
      try {
        const { intent } = await req.json();
        if (typeof intent !== 'string') throw new Error('Missing intent');
        if (!/^https?:|tel:|sms:|mailto:/i.test(intent)) {
          return new Response(JSON.stringify({ error: 'Invalid intent' }), { status: 400, headers: cors });
        }
        return new Response(JSON.stringify({ ok: true, opened: intent }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: cors });
      }
    }

    // Dynamic multi-cloud API routing: /api/{vercel|fly|cf}
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/chat') {
      const parts = url.pathname.split('/').filter(Boolean); // ['api','dest', ...]
      const dest = parts[1];
      let target: string | undefined;
      switch (dest) {
        case 'vercel':
          target = env.VERCEL_HOOK;
          break;
        case 'fly':
          target = env.FLY_HOOK;
          break;
        case 'cf':
          // Use lightning base for internal CF service passthrough if set
          target = env.LIGHTNING_BASE;
          break;
      }
      if (!target) return new Response(JSON.stringify({ error: `No target for ${dest}` }), { status: 404, headers: cors });
      const headers = new Headers(req.headers);
      // Best effort: keep origin aligned
      try { headers.set('origin', new URL(target).origin); } catch {}
      const upstream = await fetch(target + (url.search || ''), { method: req.method, headers, body: req.body, redirect: 'follow' });
      const h = new Headers(upstream.headers);
      cors['Content-Type'] = h.get('Content-Type') || 'application/json';
      return new Response(upstream.body, { status: upstream.status, headers: cors });
    }

    // Policy-aware chat proxy: /api/chat -> {base}/v1/chat/completions
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      // Local-only guard: allow only if base is private/local
      if (localOnly) {
        try {
          const base = (env.LIGHTNING_BASE || '').toLowerCase();
          const host = new URL(base).hostname;
          const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
          if (!isLocal) return new Response(JSON.stringify({ error: 'Local-only mode active' }), { status: 451, headers: cors });
        } catch {
          return new Response(JSON.stringify({ error: 'Local-only mode active' }), { status: 451, headers: cors });
        }
      }

      const policy = (url.searchParams.get('policy') || 'FAST').toUpperCase() as Policy;

      const ip = req.headers.get('CF-Connecting-IP')
        || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
        || '0.0.0.0';
      const windowKey = `rl_${ip}_${Math.floor(Date.now() / 1000 / RL_WINDOW_S)}`;
      const rlHits = await incrKV(env, windowKey, 1, RL_WINDOW_S);
      if (env.STATUS_KV && rlHits > RL_MAX_PER_IP) {
        return new Response('Rate limit exceeded', { status: 429, headers: cors });
      }

      let approxTokensIn = 0;
      try {
        const raw = await req.clone().text();
        approxTokensIn = Math.ceil(raw.length / 4);
      } catch {}
      const usageKey = dayKey('usage_tokens');
      const used = await incrKV(env, usageKey, approxTokensIn, 86400);

      const healthy = env.STATUS_KV ? (await env.STATUS_KV.get('gpu_ok')) === '1' : true;
      let effectivePolicy: Policy = used > BUDGET_DAY_TOKENS ? 'CHEAP' : policy;
      const policyMap = MODEL_BY_POLICY(env);
      let base = policyMap[effectivePolicy] || env.LIGHTNING_BASE;
      if (!healthy && env.FALLBACK_BASE) base = env.FALLBACK_BASE;

      if (!base) return new Response(JSON.stringify({ error: 'No backend configured' }), { status: 500, headers: cors });
      const target = base.replace(/\/$/, '') + '/v1/chat/completions' + (url.search || '');
      const headers = new Headers(req.headers);
      headers.set('origin', new URL(base).origin);
      if (env.LIGHTNING_TOKEN) headers.set('Authorization', `Bearer ${env.LIGHTNING_TOKEN}`);
      const upstream = await fetch(target, { method: 'POST', headers, body: req.body, redirect: 'follow' });
      const h = new Headers(upstream.headers);
      cors['Content-Type'] = h.get('Content-Type') || 'application/json';
      return new Response(upstream.body, { status: upstream.status, headers: cors });
    }

    // Route: /gemini (JSON body: { model, input })
    if (url.pathname === '/gemini' && req.method === 'POST') {
      if (localOnly && !isDevice) return new Response(JSON.stringify({ error: 'Local-only mode active' }), { status: 451, headers: cors });
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
      // Allowed in local-only mode (assumed local studio); if remote, caller should disable localOnly
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
