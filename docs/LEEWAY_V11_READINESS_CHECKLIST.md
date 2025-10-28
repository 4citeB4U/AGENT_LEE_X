/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.CHECKLIST.LEEWAY_V11_READINESS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: check-square
ICON_SIG: CD534113
5WH: WHAT=Operational Readiness Checklist; WHY=Finalize integration; WHO=LeeWay Core; WHERE=docs/LEEWAY_V11_READINESS_CHECKLIST.md; WHEN=2025-10-28; HOW=Markdown checklist
SPDX-License-Identifier: MIT
*/

# LEEWAY v11 — Operational Readiness Checklist

Mark each item as you validate. Do not de-scope.

## Architecture & Routing
- [ ] Deterministic model arbitration policy documented (docs/ARCH_ROUTING_POLICY.md)
- [ ] Fallback tiers defined (size/quant), with auto-fallback on OOM or init-timeout
- [ ] Single I/O contract in UI (runPrompt/runMacro + ResultContainer)

## Security & Privacy
- [ ] Local-only toggle enforced at runtime; egress guard installed
- [ ] API keys stored as secrets; rotation/revocation procedure noted
- [ ] User consent UX for mic/camera/storage; data retention defaults stated
- [ ] Module load paths constrained and MIME checked; no eval of untrusted code

## Deployment & Lifecycle
- [ ] ErrorBoundary + Suspense prevent blank screens
- [ ] Service Worker versioning and cache-busting path documented
- [ ] Rollback plan (revert commit or previous release artifact) captured
- [ ] Worker proxy deploy validated (cf-proxy/README.md)

## UX & Accessibility
- [ ] Primary flows keyboard-accessible; SR labels present
- [ ] aria-* values are valid; axe audits clean
- [ ] Friendly error messaging (no raw stack traces to users)

## Diagnostics & Proof
- [ ] Diagnostics route renders; all checks green (modules/local LLM/transformers/caps)
- [ ] Hard Reload button clears SW/cache reliably
- [ ] Settings surfaced: default engines + local LLM URL/model
- [ ] Logs show blocked egress when Local-only is ON

## Analytics (privacy-safe)
- [ ] Minimal telemetry defined (latency, error rate, fallback usage)
- [ ] No PII; storage scoped and TTLs documented

## Governance & Data
- [ ] Model licenses reviewed; weights not committed
- [ ] Ownership and export of user data clarified

## Go / No-Go Gate
- [ ] Diagnostics: GREEN across all checks
- [ ] Local-only toggle: validated ON/OFF behavior
- [ ] Worker proxy: /ops/metrics ok, /api/chat passthrough ok
- [ ] A11y audit: PASS
- [ ] SW/cache bust: PASS
