/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.CAPABILITIES
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: cpu
ICON_SIG: WSX-CAPS-001
5WH: WHAT=Detect runtime capabilities for routing/feature fallbacks; WHY=Pick engines based on device; WHO=Leeway Core; WHERE=services/capabilities.ts; WHEN=2025-10-27; HOW=feature detection
SPDX-License-Identifier: MIT
*/

export const CAPS = {
  webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
  wasm: typeof WebAssembly !== 'undefined',
} as const;

export type Caps = typeof CAPS;
