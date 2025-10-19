/* LEEWAY HEADER
TAG: FRONTEND.DASH.MKTG
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: DASH-MKTG-01
5WH: WHAT=Marketing dashboard route; WHY=Visualize KPIs/ROAS/CAC; WHO=LeeWay Core; WHERE=src/routes/dashboard; WHEN=2025-10-19; HOW=React+TS Tailwind
SPDX-License-Identifier: MIT
*/
import { useMemo, useState } from 'react';

// Minimal table type for uploaded rows
interface Row {
  Date?: string; Channel?: string; Source?: string; Medium?: string; Campaign?: string; AdGroup?: string; Ad?: string;
  Impressions?: string; Reach?: string; Clicks?: string; Sessions?: string; Users?: string; Cost?: string; Conversions?: string; Revenue?: string; CTR?: string; CPC?: string; CPA?: string; ROAS?: string; BounceRate?: string; PagesPerSession?: string; AvgSessionDurationSec?: string;
}

export default function MarketingDashboard() {
  const [rows, setRows] = useState<Row[]>([])

  function parseCSV(text: string): Row[] {
    // Basic CSV parser with quoted-field support; good enough for our template
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(Boolean)
    if (!lines.length) return []
    const headers = splitCsvLine(lines[0]).map(h => h.trim())
    const out: Row[] = []
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i])
      const obj: any = {}
      headers.forEach((h, idx) => { obj[h] = cells[idx] })
      out.push(obj)
    }
    return out
  }

  function splitCsvLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
        } else { cur += ch }
      } else {
        if (ch === ',') { result.push(cur.trim()); cur = '' }
        else if (ch === '"') { inQuotes = true }
        else { cur += ch }
      }
    }
    result.push(cur.trim())
    return result
  }

  function onCSV(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try { setRows(parseCSV(String(reader.result||''))) } catch { alert('Failed to parse CSV') }
    }
    reader.readAsText(file)
  }

  const aggregates = useMemo(() => {
    const agg = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, sessions: 0 }
    rows.forEach(r => {
      agg.impressions += Number(r.Impressions||0)
      agg.clicks += Number(r.Clicks||0)
      agg.cost += Number(r.Cost||0)
      agg.conversions += Number(r.Conversions||0)
      agg.revenue += Number(r.Revenue||0)
      agg.sessions += Number(r.Sessions||0)
    })
    const ctr = agg.impressions ? agg.clicks/agg.impressions : 0
    const cpc = agg.clicks ? agg.cost/agg.clicks : 0
    const cpa = agg.conversions ? agg.cost/agg.conversions : 0
    const roas = agg.cost ? agg.revenue/agg.cost : 0
    const convRate = agg.sessions ? agg.conversions/agg.sessions : 0
    return { ...agg, cpc, cpa, roas, ctr, convRate }
  }, [rows])

  return (
    <div className="p-4 sm:p-6 space-y-6 text-gray-200">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketing Dashboard</h1>
        <div className="flex items-center gap-4">
          <a href="#/dashboard/kpis" className="text-sm text-emerald-300 underline">Open KPI Badges</a>
          <a href="#/" className="text-sm text-gray-300 underline">Back to App</a>
          <label className="inline-flex items-center gap-2 cursor-pointer" aria-label="Upload CSV">
            <i className="fa-solid fa-file-arrow-up text-white/80"></i>
            <input type="file" accept=".csv" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onCSV(f) }} />
            <span className="underline">Upload CSV</span>
          </label>
        </div>
      </header>

      <section className="grid md:grid-cols-5 gap-4">
        <KPI title="Impressions" value={aggregates.impressions} />
        <KPI title="Clicks" value={aggregates.clicks} />
        <KPI title="Cost" value={aggregates.cost} prefix="$" />
        <KPI title="Revenue" value={aggregates.revenue} prefix="$" />
        <KPI title="ROAS" value={Number(aggregates.roas.toFixed(2))} suffix="x" trendIcon={aggregates.roas>=4? 'up': aggregates.roas>=2? 'flat':'down'} />
      </section>

      <section className="grid md:grid-cols-5 gap-4">
        <KPI title="CTR" value={Number((aggregates.ctr*100).toFixed(2))} suffix="%" />
        <KPI title="CPC" value={Number((aggregates.cpc||0).toFixed(2))} prefix="$" />
        <KPI title="CPA" value={Number((aggregates.cpa||0).toFixed(2))} prefix="$" />
        <KPI title="Conv Rate" value={Number((aggregates.convRate*100).toFixed(2))} suffix="%" />
        <KPI title="Sessions" value={aggregates.sessions} />
      </section>

      <div className="mt-4 border border-gray-700 rounded-lg">
        <div className="p-4">
          <h2 className="font-semibold mb-2">How to use</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-400">
            <li>Export your marketing data using the provided CSV template and upload it here.</li>
            <li>Review KPIs (targets: ROAS ≥ 4x, LTV:CAC ≥ 3x) and adjust budgets accordingly.</li>
            <li>Use attribution settings (future) to switch model: First/Last/Linear/Decay/Position.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function KPI({ title, value, prefix='', suffix='', trendIcon }:{ title:string, value:number, prefix?:string, suffix?:string, trendIcon?: 'up'|'down'|'flat' }){
  return (
    <div className="border border-gray-700 rounded-lg">
      <div className="p-4">
        <div className="text-sm text-gray-400 mb-1">{title}</div>
        <div className="text-2xl font-bold">{prefix}{Number.isFinite(value) ? value.toLocaleString() : '—'}{suffix}</div>
        {trendIcon && (
          <div className="mt-2">
            {trendIcon==='up' ? <i className="fa-solid fa-arrow-trend-up"></i> : trendIcon==='down' ? <i className="fa-solid fa-arrow-trend-down"></i> : <i className="fa-solid fa-gauge"></i>}
          </div>
        )}
      </div>
    </div>
  )
}
