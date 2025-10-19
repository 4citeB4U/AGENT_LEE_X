/* LEEWAY HEADER
TAG: SRC.MKTG.PROFIT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: badge-dollar-sign
ICON_SIG: PROFIT-GATE-01
5WH: WHAT=Profitability thresholds & release gates; WHY=Profit-first standard; WHO=LeeWay Core; WHERE=src/marketing; WHEN=2025-10-19; HOW=TypeScript
SPDX-License-Identifier: MIT
*/
export interface ProfitPolicy {
  minROAS: number // e.g., 3-4x
  minLtvToCAC: number // e.g., ≥3x
  maxCAC?: number // optional hard cap
}

export const DEFAULT_PROFIT_POLICY: ProfitPolicy = { minROAS: 4, minLtvToCAC: 3, maxCAC: 120 }

export function checkProfitability({ roas, ltvToCac, cac }:{ roas:number; ltvToCac:number; cac:number }){
  const breaches: string[] = []
  if (roas < DEFAULT_PROFIT_POLICY.minROAS) breaches.push(`ROAS<${DEFAULT_PROFIT_POLICY.minROAS}`)
  if (ltvToCac < DEFAULT_PROFIT_POLICY.minLtvToCAC) breaches.push(`LTV:CAC<${DEFAULT_PROFIT_POLICY.minLtvToCAC}`)
  if (typeof DEFAULT_PROFIT_POLICY.maxCAC==='number' && cac > DEFAULT_PROFIT_POLICY.maxCAC) breaches.push(`CAC>${DEFAULT_PROFIT_POLICY.maxCAC}`)
  return { ok: breaches.length===0, breaches }
}
