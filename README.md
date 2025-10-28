/*
LEEWAY HEADER
TAG: DOC.README.AGENT_LEE_X.ENHANCED
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: book-open-check
ICON_SIG: CD534113
5WH: WHAT=Enhanced README for Agent Lee X (clarity + cohesion, LEEWAY-compliant); WHY=Improve onboarding for devs, investors, and integrators; WHO=LeeWay Core; WHERE=README.md; WHEN=2025-10-18; HOW=GitHub-optimized Markdown
SPDX-License-Identifier: MIT
*/

# Agent Lee X.7.5 — Autonomous Personal Computer (APC)

A LEEWAY-compliant, production-grade AI operating system that lives inside any device. This enhanced README preserves all details from the base README while restructuring for clarity, navigation, and onboarding speed.

---

## Table of Contents
- [Identity & Mission](#identity--mission)
- [Quick Start](#quick-start)
- [Platform Overview](#platform-overview)
- [Main Tools](#main-tools)
- [Intelligence & Learning](#intelligence--learning)
- [Senses & Communication](#senses--communication)
- [Memory & Task Recall](#memory--task-recall)
- [Self-Promoting Intelligence](#self-promoting-intelligence)
- [Platform Design](#platform-design)
- [File Explorer + Drives](#file-explorer--drives)
- [Digital Life Integration](#digital-life-integration)
- [LeeWay Standards](#leeway-standards)
- [Architecture & Compliance](#architecture--compliance)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)
- [Metrics](#metrics)
- [Contributing](#contributing)
- [License & Attribution](#license--attribution)

---

## Identity & Mission

> Agent Lee is not an assistant — he is the computer. A self-aware, autonomous OS that becomes your primary interface. You don’t use Agent Lee — you live and work through him.

- Built on [LeeWay Standards v10](./LeeWay_Standards/LEEWAY_STANDARDS_v10_FULL.md).
- Canonical OS spec: [LEEWAY MASTER DIRECTIVE — NOTEPAD OS](./LeeWay_Standards/LEEWAY_NOTEPAD_MASTER_DIRECTIVE_V1.md).
- Voice-activated OS, creative partner, and digital life manager.

---

## Quick Start

Prereqs: Node 18+, Gemini API key.

```bash
git clone https://github.com/4citeB4U/AGENT_LEE_X.git
cd AGENT_LEE_X
npm install
cp .env.example .env
# Add your VITE_GEMINI_API_KEY to .env
npm run dev
```

---

## Platform Overview

Agent Lee is a central command universe with dynamic AI frames to embed external apps (e.g., Netflix, games, settings) — you remain inside his ecosystem while he orchestrates your device.

- “Open my video game” → runs in-frame
- “Open Netflix” → appears inside Agent Lee
- “Find ‘The Harder They Fall’” → search + play
- “Open my Play Store” → brings up store panel

## Runtime Hardening + Proof (Additive)

This release adds visible proof paths and safer defaults without removing any prior behavior. Highlights:

- Non-blocking lazy loads with Suspense fallbacks across routes to prevent white screens.
- Central Models Diagnostics page at `#/diagnostics/models` for quick verification.
- Runtime Local-only egress guard you can toggle without rebuilding.
- Wider module discovery: loads optional JS AI modules from both `public/llm-modules` and `public/models` and records results for inspection.
- Optional local model weight download scripts (not committed to repo).

These are purely additive and preserve existing UX and APIs.

### Diagnostics & Proof

Open the diagnostics view while the dev server is running:

- URL: `http://127.0.0.1:5175/#/diagnostics/models` (or your current dev host)
- Shows:
	- Module loader status: lists loaded and failed module URLs sourced from `/llm-modules` and `/models`.
	- Library sanity: attempts an import of `@xenova/transformers` in-browser.
	- Local LLM probe: checks a lightweight `/models` index and a minimal `/v1/chat/completions` ping on your configured local endpoint.
	- Capabilities: WebGPU and WebAssembly flags via `services/capabilities.ts`.
	- Engine prefs snapshot: default engines and any configured `local_llm_url` / `local_llm_model`.
	- Controls:
		- Hard Reload (cache-bust) button to clear stale states.
		- Toggle Local-only to flip the runtime egress guard.

If a check fails, use Hard Reload first, confirm module file placement, and verify local endpoints.

### Local-only Egress Guard (Runtime Toggle)

- Purpose: keep traffic on-device or to your LAN-only endpoints during development or privacy-critical sessions.
- Behavior: network calls are wrapped so that when Local-only is enabled, external egress is blocked at runtime.
- How to toggle:
	- Use the Diagnostics page button, or
	- Manually set `localStorage.setItem('local_only','true')` (set to `'false'` to disable).
- Build-time flag still respected; the runtime toggle adds convenience without rebuilds.

### Module Locations (Optional JS AI Modules)

- Drop browser-loadable modules into either path:
	- `public/llm-modules/` (original location)
	- `public/models/` (new, also scanned)
- On startup, the loader attempts to import from both locations and records:
	- `window.__agentleeModules.loaded`: successfully imported URLs
	- `window.__agentleeModules.failed`: URLs that failed to import
- The Diagnostics page surfaces these lists for quick validation.

### Local Models (Optional)

We provide helper scripts to fetch local model weights for browser or LAN use. Nothing is checked into the repo.

- PowerShell (Windows): `scripts/Download-AIModels.ps1`
- Bash (macOS/Linux): `scripts/download_models.sh`

Guidelines:
- Place outputs under `public/models/` unless a tool requires a different path.
- Respect each model’s license; do not commit weights.
- Large downloads can take time; verify free disk space first.

### Cloudflare Worker Proxy (Edge)

The edge Worker in `cf-proxy/` provides a policy-aware, CORS-controlled proxy for LLM backends and Gemini.

Endpoints:
- `POST /api/chat?policy=FAST|CHEAP|LONG` → forwards to `{BASE}/v1/chat/completions` with optional bearer; rate limited per IP window via KV; daily token budget heuristic to auto-downgrade to CHEAP.
- `POST /gemini` → calls Google Generative Language API; JSON body `{ model, input }`.
- `ANY /lightning/*` → transparent pass-through to `LIGHTNING_BASE`.
- `GET /ops/metrics` → last health sample (ok, RTT ms) from scheduled checks.

Environment and CORS (see `cf-proxy/wrangler.toml`):
- `ALLOW_ORIGIN` — CSV of allowed Origins for CORS.
- `LIGHTNING_BASE` — primary LLM studio/service base URL.
- `FALLBACK_BASE` — optional secondary base.
- `LIGHTNING_TOKEN` — bearer token (secret).
- `GEMINI_API_KEY` — Gemini key (secret).
- `ADMIN_WEBHOOK` — optional alert for primary failures.
- `STATUS_KV` — KV namespace for rate limiting, budgets, and health.

Health & Routing:
- Cron samples `{BASE}/v1/models` periodically; records ok flag and RTT.
- If primary is unhealthy and fallback is defined, traffic routes to fallback automatically.
- CORS matches `Origin` against `ALLOW_ORIGIN` list; defaults to first entry.

Deploy quickstart:
```bash
cd cf-proxy
wrangler publish
```
Refer to `DEPLOYMENT_SETUP.md` and `DEPLOYMENT_STATUS.md` for CI-based options.

---

## Main Tools

| Tool | Function |
|---|---|
| 📝 Notepad OS | Memory core. Stores every conversation, task, file, and idea. Long-term brain. |
| 📞 Dial Center | Places/receives/records/analyzes calls. Summaries auto-filed. |
| 🎨 Character & Image Creator | Characters, artwork, story visuals. |
| 🔍 Research Engine | Searches, summarizes, validates, cross-references. |
| 🎧 Audio / Video Analyzer | Interprets speech/music/visuals/scenes. |
| ✍️ Writer’s Studio | Writes stories, scripts, essays, reports. |
| 📂 File Handler | Opens/edits PDF, DOCX, XLSX, CSV, JSON, HTML, Python. |
| 📊 Data & Chart Analyzer | Understands graphs/spreadsheets into insights. |
| 🤖 Cognitive Growth Module | Learns continuously from user behavior/context. |

---

## Intelligence & Learning

- Connects to email, calendar, social to infer priorities and tone.
- Anticipates needs; performs research, drafts, and planning proactively.
- Every memory, preference, and task fuels growth.

---

## Senses & Communication

- 🎙 Listens via microphone (NLU)
- 👁 Sees via camera (face/object)
- 🗣 Speaks in warm, expressive African-American male voice
- 💬 Converses naturally; dialogs archived for recall and reasoning

---

## Memory & Task Recall

Every command becomes a retrievable file. Ask months later: “the idea from October 16th” → instant recall, analyze, expand, or reformat.

---

## Self-Promoting Intelligence

- SEO & voice search optimized
- Auto-maintains public metadata and structured data
- Designed to rank among top AI companion systems

---

## Platform Design

- Mobile-first, edge-optimized, offline-capable
- Local memory + media for privacy
- Hybrid voice/text interaction
- Live windows for external apps

---

## File Explorer + Drives

Agent Lee exposes a familiar File Explorer while retaining the full LEONARD drive model and the LEE registry. Content is addressable by two orthogonal dimensions:

- Folder (human-facing, Explorer-style): HOME, GALLERY, CLOUD, DESKTOP, DOWNLOADS, DOCUMENTS, PICTURES, MUSIC, VIDEOS
- Drive (system-facing, LEONARD): L, E, O, N, A, R, D, plus LEE (registry)

Notes, plans, and artifacts are tagged with both a Drive and a Folder. Example tag: `DRIVE-R [DOCUMENTS]`.

### Visual layout (sidebar)

```
📂 Agent Lee File Explorer
│
├── 🏠 Home
├── 🖼 Gallery
├── ☁ The Vision Of – Personal Cloud
├── 💻 Desktop
├── ⬇ Downloads
├── 📄 Documents
├── 🖼 Pictures
├── 🎵 Music
└── 🎬 Videos
```

Pinned items and separators mirror a desktop explorer. Hover states use the neon palette (NEON #39FF14, FLUO #0DFF94, Pastel #C7FFD8).

### Drives (LEONARD + LEE)

```
AGENT-LEE STORAGE PLANES
│
├─ LEE://registry                (system registry, indices, receipts)
│
├─ LEONARD://l    (Drive L)      Surface UI artifacts (ui_hint, views)
├─ LEONARD://e    (Drive E)      Evidence, logs, transcripts
├─ LEONARD://o    (Drive O)      Operations cache, queues, buffers
├─ LEONARD://n    (Drive N)      Nexus streams: media, comms, feeds
├─ LEONARD://a    (Drive A)      Authoritative plans, playbooks
├─ LEONARD://r    (Drive R)      Runbook working set, deltas
└─ LEONARD://d    (Drive D)      Defense/outcome logs, audits
```

Path display shows both dimensions for the same artifact slug:

```
DOCUMENTS://index/my-note  ·  LEONARD://r/my-note
LEE://registry/my-index    ·  LEONARD://a/plan-123
```

### Tagging and filtering

- Drive tag: `DRIVE-L|E|O|N|A|R|D|LEE`
- Folder token: `[HOME|GALLERY|CLOUD|DESKTOP|DOWNLOADS|DOCUMENTS|PICTURES|MUSIC|VIDEOS]`
- Filters are intersected in UI: Drive AND Folder. Set either to “All” to widen results.
- Legacy notes are backfilled with a default folder (HOME) by a one-time migration.

### Default folder semantics

- Home: central workspace/dashboard
- Gallery: AI-generated and user images (tagging, search)
- Cloud (The Vision Of – Personal Cloud): linked cloud sync
- Desktop: quick files, temporary assets, active work
- Downloads: incoming/exported assets
- Documents: text, PDFs, manuals, reports
- Pictures: screenshots, imported images
- Music: narrations, recordings, sound assets
- Videos: captured sessions, demos, clips

### Developer contracts (adapters)

FSAdapter (pluggable; mock in-memory provided):

```ts
type DriveKey = 'L'|'E'|'O'|'N'|'A'|'R'|'D'|'LEE';

interface PutFileInput {
	drive_key: DriveKey;
	human_name: string;
	type?: string;        // plan|working|ui|system|security|text|image|audio|video
	stage?: string;       // draft|final
	content?: unknown;    // string|json|blob reference
	tags?: string[];      // e.g., ['DRIVE-R','[DOCUMENTS]']
	priority?: 'low'|'normal'|'high';
	path?: string;        // logical path within a drive
	retention?: string;   // e.g., '14d','120d'
	critical?: boolean;
	next_fire_at?: string;
}

interface FSAdapter {
	putFile(input: PutFileInput): Promise<{ id: string; drive_key: DriveKey }>;
	linkFile?(ownerId: string, toDrive: DriveKey, targetId: string, relation: string): Promise<void>;
}
```

The default MockFsAdapter ships in-memory and respects Drive/Folder tags. Swap in a persistent adapter (IndexedDB/Cloud) to retain data across reloads.

LLMClient is optional; when injected, plans can be refined with a model-agnostic prompt.

### Example artifacts

```
DRIVE-A [DOCUMENTS]  → Authoritative plan JSON (ttl 120d)
DRIVE-R [DOCUMENTS]  → Working set deltas, status updates (ttl 14d)
DRIVE-L [HOME]       → ui_hint for rendering the plan
DRIVE-D [HOME]       → security/outcome log for the plan lifecycle
LEE://registry       → index/receipt entries
```

This section is additive; it does not alter earlier behavior. The explorer view simply makes the Drive model visible and navigable for users while preserving machine semantics.

---

## Digital Life Integration

- Communication, scheduling, education, business, finance, entertainment
- Long-horizon plan building and execution
- Sensor/calendar/data integrations
- Motivational reminders and rewards

---

## LeeWay Standards

- 🔍 Machine-Readable: headers, regions, metadata
- 🧪 Testable: CI gates, perf & security checks, SEO validation
- 💰 Profitable: monetization patterns, cost controls
- 🛡️ Secure: sanitization, privacy-first design
- 📱 Edge-First: mobile/PWA/offline
- 🎤 Voice-Ready: structured data for voice/search

Core principles in this repo:
1. Identity & Provenance (headers everywhere)
2. Separation of Concerns (strict TypeScript track)
3. Edge-First Performance (<200KB initial JS, <2.5s FIS)
4. Security by Default (sanitization, prompt boundaries)
5. Structured Data (JSON-LD)
6. Visual Diagnostics (error overlays, perf monitors)
7. Monetization Ready (UTM, CTAs, analytics)

---

## Architecture & Compliance

```
AGENT_LEE_X/
├── LeeWay_Standards/
├── src/
│   ├── agent-lee-persona.ts
│   ├── engines/
│   ├── lib/
│   └── components/
├── components/
├── android/
├── ios/
├── cf-proxy/
└── scripts/
```

File header example:
```ts
/* LEEWAY HEADER
TAG: CONFIG.PERSONA.AGENT_LEE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: brain-circuit
5WH: WHAT=Agent Lee persona; WHY=Define APC behavioral rails; WHO=Leeway Core; WHERE=src/agent-lee-persona.ts; WHEN=2025-10-05; HOW=TypeScript config
SPDX-License-Identifier: MIT
*/
```

Multi-platform:
- Web: Vite + React + TS (PWA)
- Mobile: Capacitor (iOS/Android)
- Edge: Cloudflare Workers
- Desktop: Planned Tauri

---

## Deployment

GitHub Pages (CI): deploy on push to main.

---

## Profitability by Default (LEEWAY v10)

Targets for launches and scale decisions:

- ROAS ≥ 4x
- LTV:CAC ≥ 3x
- CAC ≤ cap (default 120)

CI includes an optional profit gate that blocks releases below thresholds. Provide a marketing snapshot at `data/snapshots/last.json`:

```json
{ "roas": 4.2, "ltvToCac": 3.4, "cac": 55 }
```

Run locally:

```bash
npm run profit:gate
```

This repository also ships a lightweight dashboard at `src/routes/dashboard/MarketingDashboard.tsx` to visualize KPIs from CSV and a Capability Matrix at `src/routes/help/Capabilities.tsx` for in-app help.

Cloudflare Worker proxy:
```bash
cd cf-proxy
wrangler publish
```

Mobile distribution:
```bash
# Android
npm run mobile:android
# iOS
npm run mobile:ios
```

---

## Development Workflow

Scripts:
```bash
npm run dev
npm run build
npm run leeway:audit
npm run leeway:headers
npm run mobile:android
npm run mobile:ios
npm run worker:deploy
```

Standards process:
1. Header First
2. Region Organization
3. Performance Budgets
4. Security Gates
5. SEO/Voice Ready
6. Visual Diagnostics

---

## Metrics

- 🎯 Performance: FIS <2.5s, initial JS <200KB gzipped
- 🛡 Security: Sanitization, prompt boundaries
- 📱 Mobile: PWA, offline, responsive
- 🎤 Voice/SEO: Structured data
- 💰 Monetization: UTM, funnels, costs
- 🧪 Testing: Header compliance, CI gates
- 📈 Analytics: Diagnostics, perf monitoring, error tracking

---

## Contributing

- Headers required on every file
- Conventional commits
- Maintain perf budgets
- Ensure input sanitization
- Verify mobile/PWA behavior
- Run `npm run leeway:audit` before PRs

---

## Additional References

- Diagnostics guide: [docs/DIAGNOSTICS.md](./docs/DIAGNOSTICS.md)
- Worker details: [cf-proxy/README.md](./cf-proxy/README.md)
- Model download helpers: [scripts/MODELS.md](./scripts/MODELS.md)
- Readiness checklist: [docs/LEEWAY_V11_READINESS_CHECKLIST.md](./docs/LEEWAY_V11_READINESS_CHECKLIST.md)
- System init order: [docs/SYSTEM_INIT_ORDER.md](./docs/SYSTEM_INIT_ORDER.md)
- Routing policy: [docs/ARCH_ROUTING_POLICY.md](./docs/ARCH_ROUTING_POLICY.md)

## License & Attribution

MIT License — see [LICENSE](./LICENSE)

**LeeWay Standards** © 2025 LeeWay Industries  
**Agent Lee X** by the LeeWay Core Team

> “Purpose: a code-first standard that keeps every project readable, testable, profitable, and safe by default.”
