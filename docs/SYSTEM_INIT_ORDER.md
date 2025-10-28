/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.SYSTEM.INIT.ORDER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: workflow
ICON_SIG: CD534113
5WH: WHAT=System initialization order; WHY=Predictable boot; WHO=LeeWay Core; WHERE=docs/SYSTEM_INIT_ORDER.md; WHEN=2025-10-28; HOW=Markdown
SPDX-License-Identifier: MIT
*/

# System Initialization Order

1) Load persisted settings (engines, local LLM URL/model, local_only).
2) Install egress guard (respects runtime local_only).
3) Detect capabilities (WebGPU/WASM).
4) Load optional model modules from /llm-modules and /models; record loaded/failed.
5) Initialize providers/contexts (AgentLee, Notepad, etc.).
6) Mount ErrorBoundary + Suspense-wrapped App.
7) Register Service Worker (if enabled).
8) Render home route; Diagnostics route available for proof.
9) If WebGPU missing, set small/CPU-safe defaults (quantized models).
10) Start background health/metrics (optional, privacy-safe).
