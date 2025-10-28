/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.SYSTEM_PROMPT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: file-text
ICON_SIG: WSX-PROMPT-SVC
5WH: WHAT=Persisted system prompt service; WHY=centralize Agent Lee OS prompt; WHO=Leeway Core; WHERE=services/systemPromptService.ts; WHEN=2025-10-27; HOW=TypeScript + localStorage fallback
SPDX-License-Identifier: MIT
*/

import { AGENT_LEE_OS_PROMPT } from '../src/prompts/agentLeeSystemPrompt';

const LS_KEY = 'agent_lee_system_prompt_v1';

export function getSystemPrompt(): string {
  if (typeof window !== 'undefined') {
    const fromLS = localStorage.getItem(LS_KEY);
    if (fromLS && fromLS.trim().length > 0) return fromLS;
  }
  return AGENT_LEE_OS_PROMPT;
}

export function setSystemPrompt(text: string) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, text);
}

export function resetSystemPrompt() {
  if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
}
