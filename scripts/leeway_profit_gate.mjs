// LEEWAY HEADER
// TAG: SCRIPT.PROFIT.GATE
// COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
// ICON_FAMILY: lucide
// ICON_GLYPH: lock
// ICON_SIG: PROFIT-GATE-SCRIPT-01
// 5WH: WHAT=CI gate for profitability; WHY=Ensure launch discipline; WHO=LeeWay Core; WHERE=scripts; WHEN=2025-10-19; HOW=Node script
// SPDX-License-Identifier: MIT
import fs from 'node:fs'

const jsonPath = process.env.MKTG_SNAPSHOT||'./data/snapshots/last.json'
if(!fs.existsSync(jsonPath)){
  console.error('No marketing snapshot found at', jsonPath)
  process.exit(1)
}
const snap = JSON.parse(fs.readFileSync(jsonPath,'utf8'))
const { roas, ltvToCac, cac } = snap
const policy = { minROAS: Number(process.env.MIN_ROAS||4), minLtvToCAC: Number(process.env.MIN_LTV_CAC||3), maxCAC: Number(process.env.MAX_CAC||120) }

function fail(msg){ console.error('\n[LEEWAY PROFIT GATE] ' + msg + '\n'); process.exit(2) }

if(roas < policy.minROAS) fail(`ROAS ${roas} < ${policy.minROAS}`)
if(ltvToCac < policy.minLtvToCAC) fail(`LTV:CAC ${ltvToCac} < ${policy.minLtvToCAC}`)
if(cac > policy.maxCAC) fail(`CAC ${cac} > ${policy.maxCAC}`)

console.log('[LEEWAY PROFIT GATE] OK')
