/* LEEWAY HEADER
TAG: FRONTEND.DASH.KPI_PANEL
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: gauge
ICON_SIG: KPI-BADGES-01
5WH: WHAT=Badge panel for KPIs & CI metrics; WHY=At-a-glance compliance to LEEWAY v11; WHO=Leeway Core; WHERE=src/routes/dashboard; WHEN=2025-10-19; HOW=React+TS Tailwind
SPDX-License-Identifier: MIT
*/
import { useMemo, useState } from 'react'

type Snapshot = {
  roas?: number
  ltvToCac?: number
  cac?: number
  perfFCPms?: number
  bundleKb?: number
  seoScore?: number
  securityPct?: number
}

export default function KPIBadgePanel(){
  const [csvRows, setCsvRows] = useState<Record<string,string>[]>([])
  const [snap, setSnap] = useState<Snapshot>({})

  function splitCsvLine(line: string): string[] {
    const out: string[] = []; let cur = ''; let q=false
    for(let i=0;i<line.length;i++){
      const ch=line[i]
      if(q){ if(ch==='"'){ if(line[i+1]==='"'){cur+='"'; i++} else q=false } else cur+=ch }
      else { if(ch===','){ out.push(cur.trim()); cur='' } else if(ch==='"'){ q=true } else cur+=ch }
    }
    out.push(cur.trim()); return out
  }
  function parseCSV(text: string){
    const lines = text.replace(/\r\n?/g,'\n').split('\n').filter(Boolean)
    if(!lines.length) return []
    const headers = splitCsvLine(lines[0])
    return lines.slice(1).map(l=>{
      const cells = splitCsvLine(l); const obj: Record<string,string>={}
      headers.forEach((h,i)=> obj[h]=cells[i]); return obj
    })
  }
  function onFile(file: File){
    const reader = new FileReader()
    reader.onload = () => {
      const txt = String(reader.result||'')
      if (file.name.endsWith('.csv')) setCsvRows(parseCSV(txt))
      else if (file.name.endsWith('.json')) setSnap(safeJson(txt))
    }
    reader.readAsText(file)
  }
  function safeJson(txt:string){ try { return JSON.parse(txt) } catch { alert('Bad JSON'); return {} }
  }

  const kpis = useMemo(()=>{
    // Aggregate minimal KPIs from CSV if present
    const agg = { imp:0, clk:0, conv:0, cost:0, rev:0 }
    csvRows.forEach(r=>{ agg.imp+=+r.Impressions||0; agg.clk+=+r.Clicks||0; agg.conv+=+r.Conversions||0; agg.cost+=+r.Cost||0; agg.rev+=+r.Revenue||0 })
    const roas = agg.cost ? agg.rev/agg.cost : undefined
    const cpc = agg.clk ? agg.cost/agg.clk : undefined
    const cpa = agg.conv ? agg.cost/agg.conv : undefined
    return { roas, cpc, cpa }
  }, [csvRows])

  const merged: Snapshot = { roas: kpis.roas ?? snap.roas, ltvToCac: snap.ltvToCac, cac: snap.cac, perfFCPms: snap.perfFCPms, bundleKb: snap.bundleKb, seoScore: snap.seoScore, securityPct: snap.securityPct }

  return (
    <div className="p-4 sm:p-6 space-y-4 text-gray-200">
      <div className="flex items-center gap-3 flex-wrap">
        <a href="#/dashboard" className="text-sm text-emerald-300 underline">Open Dashboard</a>
        <a href="#/" className="text-sm text-gray-300 underline">Back to App</a>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <i className="fa-solid fa-file-arrow-up text-white/80"/>
          <input type="file" accept=".csv,.json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f) }} />
          <span className="underline">Upload CSV or JSON</span>
        </label>
        <a className="text-sm text-emerald-300 underline" href={import.meta.env.BASE_URL + 'mktg.template.csv'} target="_blank" rel="noreferrer">CSV template</a>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Badge title="ROAS" value={merged.roas} pass={(merged.roas??0) >= 4} suffix="x" />
        <Badge title="LTV:CAC" value={merged.ltvToCac} pass={(merged.ltvToCac??0) >= 3} suffix="x" />
        <Badge title="CAC" value={merged.cac} pass={(merged.cac??Infinity) <= 120} prefix="$" invert />
        <Badge title="First Contentful Paint" value={merged.perfFCPms} pass={(merged.perfFCPms??Infinity) <= 2500} suffix=" ms" />
        <Badge title="Bundle Size" value={merged.bundleKb} pass={(merged.bundleKb??Infinity) <= 200} suffix=" KB" invert />
        <Badge title="SEO Score" value={merged.seoScore} pass={(merged.seoScore??0) >= 90} suffix=" %" />
        <Badge title="Security" value={merged.securityPct} pass={(merged.securityPct??0) >= 100} suffix=" %" />
      </div>
    </div>
  )
}

function Badge({ title, value, pass, suffix='', prefix='', invert=false }:{ title:string; value?:number; pass:boolean; suffix?:string; prefix?:string; invert?:boolean }){
  const ok = Boolean(pass)
  const color = ok ? 'bg-emerald-700/60 border-emerald-600' : 'bg-amber-900/40 border-amber-700'
  const text = ok ? '✅' : '⚠️'
  return (
    <div className={`border ${color} rounded-lg p-3`}>
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-2xl font-bold">{value==null? '—' : `${prefix}${Number(value).toLocaleString()}${suffix}`}</div>
      <div className="text-sm">{text} {ok ? 'Meets target' : 'Below target'}</div>
    </div>
  )
}
