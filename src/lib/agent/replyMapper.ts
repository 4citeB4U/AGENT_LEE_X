/* LEEWAY HEADER
TAG: LIB.AGENT.REPLY_MAPPER
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: workflow
ICON_SIG: REPLY_MAPPER
5WH: WHAT=Freeform reply mapper w/ tone + ARR cadence; WHY=Consistent conversational scaffolding; WHO=Leeway Core; WHERE=src/lib/agent/replyMapper.ts; WHEN=2025-10-05; HOW=Tone inference + craftReply wrapper
SPDX-License-Identifier: MIT
*/

import { craftReply } from '../persona/formatConversation';
import { DEFAULT_BEHAVIOR, withTone } from '../persona/conversation';

// Intent → tone heuristic
function pickTone(intent: string){
  const s = intent.toLowerCase();
  if (/schedule|calendar|event|remind/.test(s)) return 'boardroom';
  if (/procure|buy|order|budget|delivery|vendor/.test(s)) return 'boardroom';
  if (/project|sprint|feature|deploy|refactor/.test(s)) return 'coach';
  return 'streetLight';
}

export function mapFreeformReply(userLine: string, body: string, next: string, intent = 'general') {
  const tone = pickTone(intent) as any;
  return craftReply(userLine, body, next, { tone });
}
