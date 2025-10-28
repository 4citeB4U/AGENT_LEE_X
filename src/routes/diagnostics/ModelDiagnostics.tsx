/* LEEWAY HEADER
TAG: FRONTEND.ROUTE.DIAGNOSTICS_MODELS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: activity
ICON_SIG: DIAG-MODELS-001
5WH: WHAT=Runtime diagnostics for local engines & modules; WHY=Verify model/module availability to avoid blank screens; WHO=Leeway Core; WHERE=src/routes/diagnostics/ModelDiagnostics.tsx; WHEN=2025-10-27; HOW=React + runtime probes
SPDX-License-Identifier: MIT
*/

import React, { useEffect, useMemo, useState } from 'react';
import * as localLlm from '../../../services/localLlmService';
import { CAPS } from '../../../services/capabilities';

interface Probe {
  name: string;
  status: 'unknown' | 'ok' | 'fail';
  detail?: string;
}

const chip = (p: Probe) => (
  <div key={p.name} className={`px-3 py-2 rounded-md text-sm border ${p.status==='ok'?'border-green-500 text-green-300 bg-green-900/20':p.status==='fail'?'border-red-500 text-red-300 bg-red-900/20':'border-gray-600 text-gray-300 bg-gray-800/40'}`}>
    <strong>{p.name}:</strong> {p.status.toUpperCase()} {p.detail? `— ${p.detail}`:''}
  </div>
);

const Section: React.FC<{ title: string } & React.PropsWithChildren> = ({ title, children }) => (
  <section className="mb-6">
    <h2 className="text-xl font-semibold mb-2 text-white">{title}</h2>
    <div className="flex gap-2 flex-wrap">{children}</div>
  </section>
);

const ModelDiagnostics: React.FC = () => {
  const [probes, setProbes] = useState<Record<string, Probe>>({});

  const setProbe = (name: string, status: Probe['status'], detail?: string) => {
    setProbes(prev => ({ ...prev, [name]: { name, status, detail } }));
  };

  const modulesLoaded = useMemo(() => {
    const w = window as any;
    return w.__agentleeModules?.loaded ?? [];
  }, []);
  const modulesFailed = useMemo(() => {
    const w = window as any;
    return w.__agentleeModules?.failed ?? [];
  }, []);

  useEffect(() => {
    // 1) Optional JS modules (browser LLMs)
    if (modulesLoaded.length === 0 && modulesFailed.length === 0) {
      setProbe('Browser modules', 'unknown', 'No modules attempted yet (place *.js in /models or /llm-modules)');
    } else {
      setProbe('Browser modules', 'ok', `${modulesLoaded.length} loaded, ${modulesFailed.length} failed`);
    }

    // 2) Local OpenAI-compatible server (LM Studio / Ollama / llama.cpp proxy)
    (async () => {
      try {
        const available = await localLlm.isAvailable();
        if (available) {
          const cfg = localLlm.getLocalLlmConfig();
          setProbe('Local LLM server', 'ok', `${cfg.url} (${cfg.model||'model: not set'})`);
          // light sanity ping (no heavy tokens)
          try {
            await localLlm.chatComplete([{ role: 'user', content: 'ping' }], { max_tokens: 4 });
            setProbe('Local LLM chat', 'ok', 'completion responded');
          } catch (e:any) {
            setProbe('Local LLM chat', 'fail', e?.message||'no response');
          }
        } else {
          setProbe('Local LLM server', 'fail', 'not responding');
        }
      } catch (e:any) {
        setProbe('Local LLM server', 'fail', e?.message||'error');
      }
    })();

    // 3) Transformers.js availability (import only)
    (async () => {
      try {
        await import('@xenova/transformers');
        setProbe('Transformers.js', 'ok', 'module importable');
      } catch (e:any) {
        setProbe('Transformers.js', 'fail', e?.message||'not available');
      }
    })();

    // Reflect engine prefs / local-only flag quickly
    try {
      const url = localStorage.getItem('local_llm_url') || 'not set';
      const model = localStorage.getItem('local_llm_model') || 'not set';
      setProbe('Prefs · Local LLM URL', 'ok', url);
      setProbe('Prefs · Local LLM Model', 'ok', model);
      const text = localStorage.getItem('default_text_engine') || 'unset';
      const vision = localStorage.getItem('default_vision_engine') || 'unset';
      const img = localStorage.getItem('default_image_engine') || 'unset';
      setProbe('Prefs · Text engine', 'ok', text);
      setProbe('Prefs · Vision engine', 'ok', vision);
      setProbe('Prefs · Image engine', 'ok', img);
      const localOnly = localStorage.getItem('local_only') === 'true';
      setProbe('Local-only mode', localOnly ? 'ok' : 'unknown', localOnly ? 'ON' : 'OFF');
    } catch {}

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = Object.values(probes);

  return (
    <div className="min-h-screen bg-black text-green-100 p-6 font-mono">
      <h1 className="text-2xl font-bold mb-4 text-[#39FF14]">Agent Lee — Model Diagnostics</h1>
      <p className="mb-6 opacity-80">This page checks optional browser modules, the local OpenAI-compatible server, and basic library availability.</p>

      <Section title="Capabilities">
        {chip({ name: 'WebGPU', status: CAPS.webgpu ? 'ok' : 'fail', detail: CAPS.webgpu ? 'available' : 'missing → CPU fallback active' })}
        {chip({ name: 'WASM', status: CAPS.wasm ? 'ok' : 'fail' })}
      </Section>

      <Section title="Module loader">
        {chip({ name: 'Modules loaded', status: 'ok', detail: String(modulesLoaded.length) })}
        {modulesLoaded.map((u: string) => chip({ name: u, status: 'ok' }))}
        {modulesFailed.map((u: string) => chip({ name: u, status: 'fail' }))}
      </Section>

      <Section title="Runtime probes">
        {list.length === 0 ? <div className="text-gray-300">Probing...</div> : list.map(chip)}
      </Section>

      <div className="mt-8 text-sm text-gray-300">
        <button
          className="mb-4 px-3 py-2 rounded border border-emerald-500 text-emerald-300 hover:bg-emerald-900/20"
          onClick={async () => {
            try {
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
              }
            } finally {
              location.reload();
            }
          }}
        >Hard Reload (clear SW/cache)</button>

        <button
          className="mb-4 ml-3 px-3 py-2 rounded border border-yellow-500 text-yellow-300 hover:bg-yellow-900/20"
          onClick={() => {
            const cur = localStorage.getItem('local_only') === 'true';
            localStorage.setItem('local_only', String(!cur));
            alert(`Local-only is now ${!cur ? 'ON' : 'OFF'} — reload recommended`);
          }}
        >Toggle Local-only</button>

        Tips:
        <ul className="list-disc pl-6">
          <li>Drop model interface files in <code>/public/models</code> (e.g., <code>phi3.js</code>, <code>gemma.js</code>). They will be auto-loaded on app start.</li>
          <li>Configure the local LLM URL/model in Settings (or via environment) to enable the local chat check.</li>
          <li>Heavy tests (loading weights) are intentionally skipped here to keep diagnostics fast.</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelDiagnostics;
