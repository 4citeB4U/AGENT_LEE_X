/* LEEWAY HEADER
TAG: LIB.AGENT.SHAPE_GUARDS
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: square-stack
ICON_SIG: SHAPE_GUARDS
5WH: WHAT=Schema clamps for deterministic JSON replies; WHY=Enforce single-question & brevity; WHO=Leeway Core; WHERE=src/lib/agent/shapeGuards.ts; WHEN=2025-10-05; HOW=Post-process filtering
SPDX-License-Identifier: MIT
*/

export function clampSchema(resp: any){
  const out = { ...resp };
  if (out?.next) {
    const hasQ = typeof out.next.question === 'string' && out.next.question.trim();
    const hasA = typeof out.next.action === 'string' && out.next.action.trim();
    if (hasQ && hasA) delete out.next.question; // prefer action
  } else {
    out.next = { action: "Confirm or say 'proceed' to execute the plan." };
  }
  if (Array.isArray(out.plan)) out.plan = out.plan.slice(0,7);
  const trim = (s:string)=> s.length>280 ? s.slice(0,277)+'…' : s;
  if (typeof out.outcome === 'string') out.outcome = trim(out.outcome);
  if (Array.isArray(out.notes)) out.notes = out.notes.map((n:string)=>trim(n));
  return out;
}
