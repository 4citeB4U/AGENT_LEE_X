/*
LEEWAY HEADER
TAG: FRONTEND.CONFIG.PUBLIC.AGENTLEE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: wrench
ICON_SIG: CD534113
5WH: WHAT=Public runtime config shell (no secrets); WHY=Expose optional proxy URL; WHO=Leeway Core; WHERE=public/agentlee.config.js; WHEN=2025-10-19; HOW=Global window var
SPDX-License-Identifier: MIT
*/
window.AGENTLEE_CONFIG = {
  // Leave empty by default; Worker URL is produced by CI deploy and can be injected if desired.
  GEMINI_PROXY_URL: ""
};
