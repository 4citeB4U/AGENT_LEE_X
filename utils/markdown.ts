/* LEEWAY HEADER
TAG: FRONTEND.UTIL.MARKDOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: file-text
ICON_SIG: CD534113
5WH: WHAT=Minimal markdown → sanitized HTML helper; WHY=Safe fallback when marked unavailable; WHO=Leeway Core (agnostic); WHERE=utils/markdown.ts; WHEN=2025-10-05; HOW=Light transform + graceful degrade
SPDX-License-Identifier: MIT
*/


export function mdToHtml(markdown: string): string {
  const w = typeof window !== "undefined" ? (window as any) : undefined;
  const marked = w?.marked?.parse ?? w?.marked ?? null;
  try {
    return marked ? marked(markdown) : markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  } catch {
    return markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
