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

# Agent Lee X.5 — Autonomous Personal Computer (APC)

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

## License & Attribution

MIT License — see [LICENSE](./LICENSE)

**LeeWay Standards** © 2025 LeeWay Industries  
**Agent Lee X** by the LeeWay Core Team

> “Purpose: a code-first standard that keeps every project readable, testable, profitable, and safe by default.”
