# LEEWAY™ Standards v8 (Frontend Edition)
Author: Rapid Web Development • Leonard Lee
Last updated: 2025-09-07

Targets: `D:\agentleegeminialmost\frontend\**` (React/TSX, Tailwind, shadcn/ui, lucide-react, public assets)

---

## 0) Purpose
Unify the entire frontend with machine-enforceable headers, structure, accessibility, build hygiene, and UI contracts that your agents depend on.

---

## 1) Canonical Headers (Long + Micro)

### 1.1 Long Header (placed at line 1)
**TypeScript/JavaScript (tsx/ts/js/jsx/mjs)**
```ts
/* LEEWAY HEADER — DO NOT REMOVE
REGION: UI.APP.SURFACE            // e.g., UI.APP.SURFACE, UI.WIDGET.NEXUS, UI.MODAL.SETTINGS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Nexus UI root; WHY=post-login SPA; WHO=RapidWebDevelop; WHERE=D:\agentleegeminialmost\frontend\src\App.tsx; WHEN=2025-09-07; HOW=React + Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/
```

**HTML**
```html
<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.HTML.ENTRY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=code ICON_SIG=CD534113
5WH: WHAT=SPA entry; WHY=mount React; WHO=RapidWebDevelop; WHERE=D:\...\frontend\public\index.html; WHEN=2025-09-07; HOW=script type=module
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
-->
```

**CSS**
```css
/* LEEWAY HEADER — DO NOT REMOVE
REGION: UI.STYLE.THEME
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=palette ICON_SIG=CD534113
5WH: WHAT=Theme tokens; WHY=consistent UI; WHO=RapidWebDevelop; WHERE=D:\...\frontend\src\styles\theme.css; WHEN=2025-09-07; HOW=Tailwind + vars
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/
```

### 1.2 Micro Header
```
/* LEEWAY MICRO: REGION=UI.PRIVATE UTIL SIG=00000000 OWNER=RapidWebDevelop WHEN=2025-09-07 */
```

---

## 2) Directory & Naming Rules
- `src/` is canonical; UI primitives live under `src/components/ui/**` (shadcn/ui compatible).
- `kebab-case` for folders; `PascalCase` for React components; `camelCase` for functions/vars.
- No spaces in filenames. Assets in `public/` use kebab-case and versioned (e.g., `macmillionmic-v2.png`).

---

## 3) UI Contracts
- **Nexus Mic** must be a single source of truth component (e.g., `src/components/NexusButton.tsx`) exposing:
  - props: `size`, `onPress`, `state: 'idle'|'listening'|'speaking'`
  - a11y: `role="button"`, `aria-pressed`, keyboard handlers (Space/Enter)
  - asset path via env (`VITE_ASSET_BASE` fallback to `/image/`).
- **Agent Cards** (Lee/Sales/Resource/Showcase) follow shared interface:
  - `title`, `draggable`, `onSend`, `onStop`, `onListen`, `onFinish`, `visibleSections`
  - include a **Stop Talking** button and focusable controls.
- **Settings Modal** must own OpenVoice controls and image-model switchers; no duplicates across the app.

---

## 4) Tailwind & shadcn/ui
- Tailwind config defines `lee` color `#39FF14` and `edge` `#242938` (already used in your system).
- Keep utility-first styles; component classes start with `ui-` prefix for quick grep.
- For shadcn/ui imports, use an alias `@/components/ui/*`. Avoid runtime path mismatches.

---

## 5) Accessibility (A11y)
- **IDs must be unique** (fixes your `messageInput` duplicate error).
- All interactive elements are keyboard reachable (Tab, Shift+Tab); `:focus-visible` outlines enabled.
- Every icon-only button has `aria-label` and `title`.
- Color contrast ≥ 4.5:1 for text. Prefer system font stack + Inter.

---

## 6) Linting & Formatting
- ESLint: react, react-hooks, @typescript-eslint, jsx-a11y.
- Prettier: 100 col, semicolons, trailing commas ES5.
- Enforce import alias `@/*` via tsconfig `paths`.

---

## 7) Build & Assets
- `index.html` is the only mount; React root `#root` is unique (no duplicate IDs).
- `vite` (preferred) or CRA replacement; ensure `type="module"` scripts.
- All images referenced by components exist in `/public/image/*`. Provide a guard that logs a warning if missing.

---

## 8) Logging & Telemetry (Frontend)
- Use `console.debug/info/warn/error` with namespace `ui:<area>` (e.g., `ui:nexus`, `ui:settings`).
- Include `reqId` and `agent` when relevant; redact PII.

---

## 9) Security
- No secrets in frontend. Only public keys go in `.env` (Vite: `VITE_*`).
- Sanitize user-entered HTML; avoid `dangerouslySetInnerHTML` unless sanitized.

---

## 10) Tests & Smoke
- **Render smoke**: each exported component renders without throwing.
- **A11y smoke**: `@testing-library/react` + `axe-core` to flag obvious issues.
- **Asset smoke**: build fails if required images are missing.

---

## 11) Migration from v7 → v8 (Frontend)
1. Apply LEEWAY headers (script below).
2. Fix duplicate IDs (`messageInput` ⇒ make them unique).
3. Extract Nexus mic into single component + prop contract.
4. Consolidate Settings/OpenVoice into one modal; remove shadow copies.
5. Run smoke (a11y, render, asset).

---

## 12) Appendix — Comment Styles
| Ext | Start | End |
| --- | --- | --- |
| .ts/.tsx/.js/.jsx/.mjs | `/*` | `*/` |
| .html | `<!--` | `-->` |
| .css | `/*` | `*/` |

Stay neon — LEEWAY™ v8 (Frontend).