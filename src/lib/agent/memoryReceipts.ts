/* LEEWAY HEADER
TAG: LIB.AGENT.MEMORY_RECEIPTS
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: receipt
ICON_SIG: MEMORY_RECEIPTS
5WH: WHAT=Lightweight memory receipts line; WHY=Expose memory usages for trust; WHO=Leeway Core; WHERE=src/lib/agent/memoryReceipts.ts; WHEN=2025-10-05; HOW=Simple join & truncation
SPDX-License-Identifier: MIT
*/

export function receiptsLine(memoryKeys: string[] = []){
  if (!memoryKeys.length) return '';
  const top = memoryKeys.slice(0,3).join(', ');
  return `\n(Checked memory: ${top}${memoryKeys.length>3 ? ' +' + (memoryKeys.length-3) + ' more' : ''})`;
}
