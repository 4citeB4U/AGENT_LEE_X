/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: setup.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\LeeWay_Standards\LeeWay_Test\test\setup.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// Vitest + DOM helpers
import '@testing-library/jest-dom';

declare global {
  // Optional: guard if a few tests need fetch
  // eslint-disable-next-line no-var
  var fetch: typeof globalThis.fetch | undefined;
}
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = async () => new Response('', { status: 200 });
}
