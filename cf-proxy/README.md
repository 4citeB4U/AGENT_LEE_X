/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.README.CF_PROXY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: cloud
ICON_SIG: CD534113
5WH: WHAT=Cloudflare Worker proxy docs; WHY=configure & verify LLM/Gemini edge services; WHO=LeeWay Core; WHERE=cf-proxy/README.md; WHEN=2025-10-28; HOW=Markdown
SPDX-License-Identifier: MIT
*/

# Cloudflare Worker — Agent Lee Edge Proxy

Policy-aware, CORS-controlled proxy that fronts your LLM backends and Gemini API. Additive to the app; safe defaults and health checks included.

---

## Quick Start

```bash
cd cf-proxy
# Set required secrets (interactive)
wrangler secret put GEMINI_API_KEY
wrangler secret put LIGHTNING_TOKEN   # optional if your backend is public
# Publish
wrangler publish
```

Live example URLs after publish:
- Worker base: https://<your-worker>.<account>.workers.dev
- Ops metrics: https://<worker>/ops/metrics

---

## Endpoints

- POST `/api/chat?policy=FAST|CHEAP|LONG` → forwards to `{BASE}/v1/chat/completions`
  - Policy → base mapping is configured from env (see below)
  - Adds Authorization: `Bearer LIGHTNING_TOKEN` when provided
  - Rate limit: windowed per IP via KV (`RL_WINDOW_S`, `RL_MAX_PER_IP`)
  - Budget: daily token heuristic, falls back to CHEAP over threshold
- POST `/gemini` → Google Generative Language API
  - Body: `{ model, input }` where `model` defaults to `models/gemini-1.5-flash`
  - Requires `GEMINI_API_KEY` secret
- ANY `/lightning/*` → transparent pass-through to `LIGHTNING_BASE`
- GET `/ops/metrics` → `{ ok, rtt }` from last health sample
- GET `/apps/status` → provider presence flags `{ lightning, gemini, openai, vercel, fly, cf }`
- GET `/ops/config` → sanitized config for diagnostics
- POST `/intent/relay` (mobile only) → allows safe `tel:`, `sms:`, `mailto:`, `https:` intents
- ANY `/api/{vercel|fly|cf}` → forwards to configured hook/endpoint

---

## Environment & CORS

Configure in `wrangler.toml` (non-sensitive) and as secrets (sensitive):

- ALLOW_ORIGIN: CSV of allowed Origins for CORS (e.g. `https://<user>.github.io`)
- LIGHTNING_BASE: primary LLM base URL (e.g. `https://studio:8000`)
- FALLBACK_BASE: optional backup base URL
- ADMIN_WEBHOOK: optional Slack/Discord webhook for health alerts
- STATUS_KV: KV binding for rate limit/budget/health samples
 - LOCAL_ONLY: `'true'|'false'` (optional): block remote LLM egress when true
 - VERCEL_HOOK, FLY_HOOK: optional webhook/endpoint URLs

Secrets:
- GEMINI_API_KEY
- LIGHTNING_TOKEN

CORS behavior: echoes the request `Origin` when it matches any entry in ALLOW_ORIGIN; defaults to the first allowed value otherwise. Varies on `Origin`.
Supports wildcard subdomains (`https://*.vercel.app`, `https://*.pages.dev`).

---

## Health & Routing

- Cron (`*/2 * * * *`) probes `{LIGHTNING_BASE}/v1/models`
- Writes to KV: `gpu_ok` (1/0) and `gpu_rtt_ms`
- `/ops/metrics` exposes the last sample as JSON; cached `no-store`
- If `gpu_ok` is false and `FALLBACK_BASE` is set, `/api/chat` routes to fallback automatically

---

## Policy Map

`FAST`, `CHEAP`, `LONG` map to bases by env:

```ts
const MODEL_BY_POLICY = (env: Env) => ({
  FAST: env.LIGHTNING_BASE,
  CHEAP: env.FALLBACK_BASE || env.LIGHTNING_BASE,
  LONG: env.LIGHTNING_BASE,
});
```

You can customize in `src/worker.ts` if needed.

---

## Verify with curl

```bash
# Ops health
curl -sSL "https://<worker>/ops/metrics" | jq

# Chat proxy (non-stream example)
curl -sSL -X POST "https://<worker>/api/chat?policy=FAST" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"ping"}],
    "max_tokens": 4
  }' | jq
```

---

## Security Notes

- Never commit secrets. Use `wrangler secret put`.
- Constrain `ALLOW_ORIGIN` to the exact production Origins.
- KV is used for basic metering, not for storing PII.

---

## Files

- `wrangler.toml` — Vars, KV bindings, cron
- `src/worker.ts` — Proxy, CORS, policy routing, rate limit, Gemini

---

## License

MIT (see SPDX in headers)
