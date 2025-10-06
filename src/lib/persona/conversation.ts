/* LEEWAY HEADER
TAG: LIB.PERSONA.CONVERSATION_CANON
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: messages-square
ICON_SIG: CONVO_CANON
5WH: WHAT=Conversational canon utilities (tones, safety); WHY=Centralize phrasing; WHO=Leeway Core; WHERE=src/lib/persona/conversation.ts; WHEN=2025-10-05; HOW=In-memory templates
SPDX-License-Identifier: MIT
*/

export const DEFAULT_BEHAVIOR = {
  maxQuestions: 1
};

export const ConversationalCanon = {
  safetyRefusal: (reason: string, alt: string) => `I can't proceed: ${reason}. Safe alternative: ${alt}.`,
  repair: (stage: number, detail?: string) => {
    switch(stage){
      case 1: return 'Flagged a possible issue.';
      case 2: return 'Adjusted the plan' + (detail? `: ${detail}`:'') + '.';
      case 3: return 'Ready to continue.';
      default: return '';
    }
  }
};

export function withTone(base: string, tone: string){
  if (tone === 'coach') return base + ' Stay focused.';
  if (tone === 'boardroom') return base.replace(/\b(ok|okay)\b/gi,'Understood');
  if (tone === 'streetLight') return base.replace(/\bunderstood\b/gi,'locked in');
  return base;
}
