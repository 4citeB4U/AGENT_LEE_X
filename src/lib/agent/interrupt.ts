/* LEEWAY HEADER
TAG: LIB.AGENT.INTERRUPT
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: pause-circle
ICON_SIG: INTERRUPT_HANDLER
5WH: WHAT=Interruption pivot reply helper; WHY=Graceful mid-stream context switch; WHO=Leeway Core; WHERE=src/lib/agent/interrupt.ts; WHEN=2025-10-05; HOW=Simplified craftReply wrapper
SPDX-License-Identifier: MIT
*/

import { craftReply } from '../persona/formatConversation';

export function handleInterruption(userLine: string){
  const body = 'Pausing the current step. I’ll park it and switch context.';
  return craftReply(userLine, body, "Continue the new topic, or say 'resume previous'.", { tone: 'coach' });
}
