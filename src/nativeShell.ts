/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: nativeShell.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\nativeShell.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

/** 
 * Open a URL. In a true native Capacitor app, this would use the in-app browser.
 * In this web-only environment, it falls back to the provided desktop behavior 
 * or opens a new tab.
 */
export async function openSmart(url: string, desktopFallback?: (u: string) => void) {
  // Capacitor's Browser plugin is not available in this web environment.
  // We will directly use the fallback logic.
  if (desktopFallback) {
    return desktopFallback(url);
  }
  // As a final fallback, open in a new tab.
  window.open(url, '_blank', 'noopener,noreferrer');
}
