/* LEEWAY HEADER
TAG: LIB.MONETIZATION.EVENTS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: coins
ICON_SIG: REVENUE-EVENTS-02
5WH: WHAT=Revenue events + logs; WHY=Profit tracking; WHO=LeeWay Core; WHERE=src/lib/monetization; WHEN=2025-10-19; HOW=TypeScript
SPDX-License-Identifier: MIT
*/
export type RevenueEvent = 'view_offer'|'start_checkout'|'purchase'|'renewal'|'cancel'
export interface RevenuePayload { event: RevenueEvent; plan?: string; price?: number; currency?: string; userId?: string; meta?: Record<string,any> }

export function emitRevenue(p: RevenuePayload){
  const evt = { ...p, ts: new Date().toISOString() }
  try {
    const key = 'agent-lee-revenue-log'
    const arr = JSON.parse(localStorage.getItem(key) || '[]')
    arr.push(evt)
    localStorage.setItem(key, JSON.stringify(arr))
  } catch {}
  console.log('[Revenue]', evt)
}
