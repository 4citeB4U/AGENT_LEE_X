/* LEEWAY HEADER
TAG: LIB.PERSONA.FORMAT_CONVO
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: message-square
ICON_SIG: FORMAT_CONVO
5WH: WHAT=Reply formatter enforcing ARR cadence + Next; WHY=Consistent voice; WHO=Leeway Core; WHERE=src/lib/persona/formatConversation.ts; WHEN=2025-10-05; HOW=Template + guard rails
SPDX-License-Identifier: MIT
*/

export interface CraftReplyOptions { tone?: string }

function applyTone(text: string, tone?: string){
  if (!tone) return text;
  switch (tone){
    case 'boardroom': return text.replace(/\b(okay|ok)\b/gi,'Understood');
    case 'coach': return text + ' Keep momentum.';
    case 'streetLight': return text.replace(/\bunderstood\b/gi,'locked in');
    default: return text;
  }
}

function sanitizeQuestions(text: string){
  const qs = (text.match(/\?/g) || []).length;
  if (qs <= 1) return text;
  // Keep first question mark only
  let seen = 0;
  return text.replace(/\?/g, m => (++seen === 1 ? m : '.'));
}

export function craftReply(userLine: string, body: string, next: string, opts: CraftReplyOptions = {}){
  // ARR: Acknowledge, Reflect, Respond
  const ack = `Noted.`; // could evolve to dynamic
  const reflect = userLine ? `You said: “${userLine.slice(0,140)}${userLine.length>140?'…':''}”` : '';
  const respond = body.trim();
  let assembled = [ack, reflect, respond].filter(Boolean).join(' ');
  assembled = sanitizeQuestions(assembled);
  assembled = applyTone(assembled, opts.tone);
  const suffix = next ? `\n\nNext: ${next}` : '';
  return assembled + suffix;
}
