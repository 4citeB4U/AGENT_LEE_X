/* LEEWAY HEADER
TAG: LIB.CONVERSATION.FLUSH
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: history
ICON_SIG: CONVO_FLUSH
5WH: WHAT=Central flush broadcaster; WHY=Decouple UI (countdown/puck) from App internal state; WHO=Leeway Core; WHERE=src/lib/conversation/flush.ts; WHEN=2025-10-05; HOW=Event listeners + state snapshot
SPDX-License-Identifier: MIT
*/

interface FlushInfo { at: string; count: number }
let _lastFlushAtISO: string | null = null;
let _lastFlushCount = 0;
const _listeners = new Set<(t: { at: string; count: number }) => void>();

export function getLastFlushInfo() { return { at: _lastFlushAtISO, count: _lastFlushCount }; }
export function onConversationFlushed(fn: (t: { at: string; count: number }) => void) { _listeners.add(fn); return () => _listeners.delete(fn); }
export function emitConversationFlushed(atISO: string, count: number) {
  _lastFlushAtISO = atISO; _lastFlushCount = count; _listeners.forEach(fn => fn({ at: atISO, count }));
}
