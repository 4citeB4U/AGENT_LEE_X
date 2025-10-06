/* LEEWAY HEADER
TAG: LIB.AGENT.SAFETY_REPAIR
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: shield-alert
ICON_SIG: SAFETY_REPAIR
5WH: WHAT=Safety refusal & repair helpers; WHY=Unified graceful declines & corrections; WHO=Leeway Core; WHERE=src/lib/agent/safetyAndRepair.ts; WHEN=2025-10-05; HOW=Canon templates + craftReply
SPDX-License-Identifier: MIT
*/

import { ConversationalCanon } from '../persona/conversation';
import { craftReply } from '../persona/formatConversation';

export function refuse(userLine: string, reason: string, alt: string){
  const body = ConversationalCanon.safetyRefusal(reason, alt);
  return craftReply(userLine, body, "Pick the alternative or ask for a safe variant.", { tone: 'boardroom' });
}

export function repair(userLine: string, detail?: string){
  const body = [
    ConversationalCanon.repair(1),
    ConversationalCanon.repair(2, detail),
    ConversationalCanon.repair(3)
  ].join(' ');
  return craftReply(userLine, body, 'Proceed with the corrected plan?', { tone: 'boardroom' });
}
