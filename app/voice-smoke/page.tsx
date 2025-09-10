"use client";
import React, { useEffect, useRef, useState } from 'react';

function useLogger() {
  const [lines, setLines] = useState<string[]>([]);
  const log = React.useCallback((...args: unknown[]) => {
    const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    setLines(prev => {
      // avoid updating state if the last line is identical to prevent render loops
      if (prev.length && prev[prev.length - 1] === s) return prev;
      return [...prev, s].slice(-400);
    });
    // eslint-disable-next-line no-console
    console.log(...args);
  }, []);
  return { lines, log };
}

export default function VoiceSmoke() {
  const { lines, log } = useLogger();
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [voices, setVoices] = useState<string[]>([]);
  const [voice, setVoice] = useState('am_michael');
  const [speed, setSpeed] = useState(0.95);
  const [speakText, setSpeakText] = useState('Howdy partner — Agent Lee is online and ready.');
  const [userMsg, setUserMsg] = useState('Summarize benefits of in-browser AI.');
  const [answer, setAnswer] = useState('');

  // Create worker once on mount. Keep log out of the dependency array so HMR/refresh
  // doesn't cause infinite recreate loops in development.
  useEffect(() => {
    // Persist worker across HMR by attaching to window.
    const win = window as any;
    if (!win.__kokoroWorker) {
      win.__kokoroWorker = new Worker(new URL('../../src/workers/kokoro-worker.ts', import.meta.url), { type: 'module' });
    }
    const w = win.__kokoroWorker as Worker;
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<any>) => {
      const { type } = e.data || {};
      if (type === 'ready') {
        // worker alive; modelLoaded may be false initially and true when finished
        setReady(true);
        if (e.data.modelLoaded) setModelLoaded(true);
        log('Kokoro worker: ready', 'modelLoaded=' + String(e.data.modelLoaded));
      }
      else if (type === 'voices') { setVoices(e.data.voices || []); }
      else if (type === 'audio') { void playPCM(e.data.data, e.data.sampleRate, e.data.channels).catch(err => log('Audio play error:', err)); }
      else if (type === 'wav') { void playWav(e.data.buffer).catch(err => log('WAV play error:', err)); }
      else if (type === 'error') { log('Worker error:', e.data.error, e.data.debug ? ('debug: ' + JSON.stringify(e.data.debug)) : ''); }
      else { log('Worker msg:', e.data); }
    };
    w.postMessage({ type: 'init', payload: { modelId: 'onnx-community/Kokoro-82M-ONNX', dtype: 'q4' } });
    return () => w.terminate();
    // Intentionally omit `log` from dependencies to keep a stable worker instance across renders
  }, []);

  // Log ready transitions once to avoid repeated spam during HMR
  const hasLoggedReady = useRef(false);
  useEffect(() => {
    if (ready && !hasLoggedReady.current) {
      hasLoggedReady.current = true;
      log('Kokoro worker: ready (worker up)');
    }
  }, [ready, log]);

  useEffect(() => { if (ready) workerRef.current?.postMessage({ type: 'list' }); }, [ready]);

  // Background prefetch: warm the Kokoro runtime after the page becomes idle
  useEffect(() => {
    if (!workerRef.current) return;
    const id = (window as any).requestIdleCallback?.(async () => {
      try {
        // Ask the worker to load runtime (but not model) to warm caches and fetch wasm
        workerRef.current?.postMessage({ type: 'init', payload: { modelId: null } });
        log('Scheduled kokoro runtime prefetch (idle).');
      } catch (e) { /* noop */ }
    }, { timeout: 2000 });
    return () => { try { (window as any).cancelIdleCallback?.(id); } catch {} };
  }, []);

  const speak = (text: string) => {
    if (!text.trim()) return;
    if (!ready) { log('Worker not ready; click once on page then retry.'); }
    workerRef.current?.postMessage({ type: 'generate', payload: { text, voice, speed } });
  };

  const mockLLM = (prompt: string) => {
    const p = prompt.toLowerCase();
    if (p.includes('benefit') || p.includes('advantages')) return `In-browser AI keeps data local, reduces latency, avoids vendor lock-in, and can work offline for certain tasks.\n\nGreat for privacy and fast UI feedback.`;
    if (p.includes('summarize')) return `Summary: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`;
    if (p.includes('hello') || p.includes('howdy')) return `Howdy! Agent Lee here. Running locally, ready to speak and help with research.`;
    return `I read: “${prompt}”. For this smoke test, I’m a tiny rule-based mock. We’ll switch to your real LLM endpoint next.`;
  };

  return (
    <div className="max-w-[900px] mx-auto mt-8 px-4 font-sans">
      <h1 className="text-2xl font-semibold">Agent Lee  Voice + LLM Smoke Test</h1>
      <p className="text-muted-foreground">This page tests in-browser Kokoro TTS (no keys) and a simple mock LLM flow to confirm end-to-end speaking.</p>

      {/* Status badge (a11y) */}
  <div aria-live="polite" className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/70 backdrop-blur border-gray-200 text-gray-700">
        <span className="font-medium">Engine:</span>
        <span className={"inline-flex items-center gap-1 font-semibold " + (ready ? "text-green-600" : "text-red-600")}>
          <span className={"h-2 w-2 rounded-full " + (ready ? "bg-green-500" : "bg-red-500 animate-pulse")} aria-hidden="true" />
          {ready ? "Ready" : "Loading…"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md">
          <h3>1) Voice Test (Kokoro)</h3>
            <div className="flex gap-2 items-center my-2">
              <label htmlFor="speakText" className="sr-only">Text to speak</label>
              <input id="speakText" value={speakText} onChange={e => setSpeakText(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base" />
              <button onClick={() => speak(speakText)} className="border border-gray-300 bg-white rounded-lg px-4 py-2 font-semibold">Speak</button>
            </div>
            <div className="flex gap-3 items-center my-2">
              <label htmlFor="voiceSelect" className="text-sm">Voice</label>
              <select id="voiceSelect" aria-label="Kokoro voice" value={voice} onChange={e => setVoice(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
                {(voices.length ? voices : ['am_michael','am_fenrir','am_liam','am_eric','am_echo','am_onyx','af_sky']).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <label htmlFor="speedInput" className="text-sm">Speed</label>
              <input id="speedInput" type="number" min={0.5} max={1.5} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-24 px-2 py-2 border border-gray-300 rounded-md" />
            </div>
        </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md">
          <h3>2) Simple Chat (Mock LLM)</h3>
            <div className="flex gap-2 items-center my-2">
              <label htmlFor="userMsg" className="sr-only">User message</label>
              <input id="userMsg" value={userMsg} onChange={e => setUserMsg(e.target.value)} placeholder="Ask anything…" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base" />
              <button onClick={() => { const a = mockLLM(userMsg); setAnswer(a); log('Mock LLM answer ready.'); }} className="border border-gray-300 bg-white rounded-lg px-4 py-2 font-semibold">Ask</button>
            </div>
            <textarea id="chatOutArea" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="LLM answer appears here…" className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 mt-2" />
            <div className="flex gap-2 items-center mt-2">
              <button onClick={() => speak(answer)} className="border border-gray-300 bg-white rounded-lg px-4 py-2 font-semibold">Speak Answer</button>
            </div>
        </div>
      </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 shadow-md">
          <h3>Logs — worker: {ready ? 'alive' : 'down'}{modelLoaded ? ' (model loaded)' : modelLoaded===false && ready ? ' (model loading...)' : ''}</h3>
          <pre className="bg-black text-white font-mono p-3 rounded-md max-h-[180px] overflow-auto">{lines.join('\n')}</pre>
        </div>
    </div>
  );
}

// ---------- audio helpers ----------
async function playPCM(channelsData: (ArrayBuffer | SharedArrayBuffer | Float32Array)[], sampleRate: number, channels: number) {
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error('No AudioContext');
  const ctx = new AC();
  try {
    const sr = Math.max(8000, Math.min(96000, Number(sampleRate) || 24000));
    const frames = new Float32Array(channelsData[0] as any).length;
    const buffer = ctx.createBuffer(channels, frames, sr);
    for (let c = 0; c < channels; c++) {
      const f32 = channelsData[c] instanceof Float32Array ? (channelsData[c] as Float32Array) : new Float32Array(channelsData[c] as ArrayBuffer);
      buffer.getChannelData(c).set(f32);
    }
    const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(ctx.destination);
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
    src.start(0); await new Promise<void>(r => (src.onended = () => r()));
  } finally { try { await ctx.close(); } catch {} }
}

async function playWav(arrBuf: ArrayBuffer) {
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (AC) {
    try {
      const ctx = new AC();
      const bufCopy = arrBuf.slice(0);
      const decoded: AudioBuffer = await new Promise((resolve, reject) => {
        try {
          const p = (ctx as any).decodeAudioData(bufCopy);
          if (p && typeof (p as Promise<AudioBuffer>).then === 'function') (p as Promise<AudioBuffer>).then(resolve).catch(reject);
          else (ctx as any).decodeAudioData(bufCopy, resolve, reject);
        } catch (e) { reject(e); }
      });
      const src = ctx.createBufferSource(); src.buffer = decoded; src.connect(ctx.destination); src.start(0);
      await new Promise<void>(r => (src.onended = () => r())); await ctx.close(); return;
    } catch {/* fall through */}
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(arrBuf)], { type: 'audio/wav' }));
  const el = new Audio(url); await el.play(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
