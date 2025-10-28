/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.DIAGNOSTICS.MODELS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: stethoscope
ICON_SIG: CD534113
5WH: WHAT=Models Diagnostics guide; WHY=quick proof and troubleshooting; WHO=LeeWay Core; WHERE=docs/DIAGNOSTICS.md; WHEN=2025-10-28; HOW=Markdown
SPDX-License-Identifier: MIT
*/

# Models Diagnostics — Proof & Troubleshooting

A built-in page that validates optional browser modules, local LLM endpoints, `@xenova/transformers`, and device capabilities. Purely additive; does not change core flows.

---

## Open the Page

- Dev URL: `http://127.0.0.1:5175/#/diagnostics/models`
- Production URL: `https://<your-site>/#/diagnostics/models`

---

## What You See

- Module Loader Results
  - Sources: `/llm-modules` and `/models`
  - `loaded`: successfully imported module URLs
  - `failed`: module URLs that failed to import
- Library Sanity
  - Attempts import of `@xenova/transformers` in-browser
- Local LLM Probes
  - Tries to list `/models` and perform a minimal `/v1/chat/completions` ping
- Capabilities
  - WebGPU / WebAssembly flags via `services/capabilities.ts`
- Engine Preferences
  - Displays default engines and any `local_llm_url` / `local_llm_model`
- Controls
  - Hard Reload: cache-bust and reload
  - Toggle Local-only: flips the runtime egress guard

---

## Local-only Egress Guard

- Toggle via button on this page or by running in console:
  - `localStorage.setItem('local_only','true')` → enable
  - `localStorage.setItem('local_only','false')` → disable
- When enabled, external egress is blocked at runtime (build flag still respected).

---

## Expected Outcomes

- Green checks on loader, transformers, capabilities
- Local LLM ping OK when your endpoint is reachable
- After Hard Reload, previously stale or cached modules should refresh

---

## Common Issues

- Module not loading
  - Verify file placed under `public/llm-modules/` or `public/models/`
  - Confirm correct URL and no mixed-content (http on https) problems
- Local LLM ping failing
  - Ensure the endpoint URL is correct in settings or environment
  - Confirm CORS if calling via the Worker or external host
- `@xenova/transformers` errors
  - Ensure the dependency is installed and compatible with your browser

---

## Related Docs

- Main README — Runtime Hardening + Proof
- Worker — `cf-proxy/README.md`
- Models — `scripts/MODELS.md`

---

## License

MIT (see SPDX in headers)
