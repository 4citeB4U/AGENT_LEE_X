/* LEEWAY HEADER
TAG: FRONTEND.HELP.CAPABILITIES
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: list-collapse
ICON_SIG: HELP-CAPS-01
5WH: WHAT=Dropdown capability matrix; WHY=User clarity; WHO=LeeWay Core; WHERE=src/routes/help; WHEN=2025-10-19; HOW=React TS Tailwind
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function Capabilities(){
  return (
    <div className="p-4 sm:p-6 space-y-4 text-gray-200">
      <h1 className="text-2xl font-bold">Agent Lee — Capability Matrix</h1>
  {SECTIONS.map(s=> <Section key={s.t} t={s.t} items={s.items}/>) }
    </div>
  )
}

type SectionProps = { t: string; items: { title: string; bullets: string[] }[]; key?: React.Key }
const Section = ({ t, items }: SectionProps) => {
  return (
    <details className="border border-gray-700 rounded-lg p-3" open>
      <summary className="font-semibold cursor-pointer">{t}</summary>
      <div className="grid md:grid-cols-2 gap-4 mt-3">
        {items.map((it,i)=> (
          <div key={i} className="border border-gray-700 rounded-md p-3">
            <div className="font-medium mb-2">{it.title}</div>
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-300">
              {it.bullets.map((b,j)=>(<li key={j}>{b}</li>))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}

const SECTIONS = [
  { t: 'Core Autonomy', items: [
    { title: 'Self-Learning & Reasoning', bullets: ['Learns from behavior & feedback','Local reasoning memory','System Check after complex actions']},
    { title: 'Self-Healing', bullets: ['Detects degraded states','Applies safe fallbacks','Offline-friendly edge mode']},
    { title: 'Memory & Recall', bullets: ['Stores conversations/tasks/files','Recall by date/topic','Merge & repurpose ideas']}
  ]},
  { t: 'Communication & Interaction', items: [
    { title: 'Voice, Vision, Presence', bullets: ['Mic NLU (consent)','Camera awareness (consent)','Expressive TTS voice','Text/silent modes','Archived interactions']},
    { title: 'Conversational Intelligence', bullets: ['Context carryover','Tone-aware responses','Actionable closures']}
  ]},
  { t: 'Knowledge & Creative Tools', items: [
    { title: 'Research Engine', bullets: ['Cited summaries','Validated cross-refs','No private scraping']},
    { title: 'Writer’s Studio', bullets: ['Essays/reports/scripts','Adaptive tone','Ethical content only']},
    { title: 'Character & Image', bullets: ['Consistent styles','Brand palettes','No violent/explicit imagery']},
    { title: 'Audio/Video Analyzer', bullets: ['Transcribe/summarize','Themes & sentiment','Consent-based recording']},
    { title: 'Data & Charts', bullets: ['Read CSV/XLSX/PDF','KPI insights','Confirm before mutating data']}
  ]},
  { t: 'System Control & Integration', items: [
    { title: 'AI Frames Hosting', bullets: ['Open apps in-frame','Voice navigation','Respect OS/DRM']},
    { title: 'File Handler', bullets: ['Open/edit/convert major types','Version history in Notepad OS','No auto-exec of scripts']},
    { title: 'Dial Center', bullets: ['Place/record calls (consent)','Transcribe & summarize','No auto-record without dual consent']},
    { title: 'Calendar & Tasks', bullets: ['Schedule events','Motivational nudges','Auth before third-party edits']}
  ]},
  { t: 'Growth & Analytics', items: [
    { title: 'Adaptive Reasoning', bullets: ['Strategy modes: Survival/Stability/Scale','Balance creativity vs. efficiency','No irreversible decisions']},
    { title: 'Diagnostics & Self-Audit', bullets: ['Perf & bundle audits','Non-LEEWAY detection','Compliance + cost summaries']}
  ]},
  { t: 'Privacy, Ethics, Security', items: [
    { title: 'Privacy Envelope', bullets: ['Local-first memory','Consent gates','Erase/forget controls','No data exfil without approval']},
    { title: 'Ethical Guardrails', bullets: ['Refuse illegal/harmful','Disclaimers for sensitive topics','No misinformation']}
  ]},
  { t: 'Tech & Platform', items: [
    { title: 'Environments', bullets: ['Web PWA','iOS/Android (Capacitor)','Edge (Cloudflare)','Desktop (Tauri planned)']},
    { title: 'Dev Tools', bullets: ['LEEWAY audit/headers','Vitest + CI','Vite/HMR capsule','Budget gates']}
  ]},
  { t: 'Monetization & SEO', items: [
    { title: 'Marketing & Discovery', bullets: ['JSON-LD structured data','Sitemaps + metadata','UTM & analytics hooks','Anonymized metrics']},
    { title: 'Revenue Hooks', bullets: ['CTAs & plans','Subscription logic','A/B tests & conversion dashboards','Gateway via Stripe']}
  ]}
]
