// Cadence-smart TTS module (front-end only)
export interface LeeTtsConfig {
  baseRate: number; basePitch: number; volume: number; pauseMs: number; varyRate: number; varyPitch: number; maxChunkChars: number;
}

interface InternalState { ready: boolean; voice: SpeechSynthesisVoice | null; fallbackVoice: SpeechSynthesisVoice | null; cfg: LeeTtsConfig; }

const state: InternalState = {
  ready: false,
  voice: null,
  fallbackVoice: null,
  cfg: { baseRate: 1.08, basePitch: 0.95, volume: 1.0, pauseMs: 160, varyRate: 0.06, varyPitch: 0.04, maxChunkChars: 110 }
};

function pickVoice() {
  const voices = speechSynthesis.getVoices() || [];
  const prefer = voices.find(v => /online|natural/i.test(v.name) && /en/i.test(v.lang));
  const alt = voices.find(v => /(microsoft|google)/i.test(v.name) && /en/i.test(v.lang));
  const anyEn = voices.find(v => /en/i.test(v.lang));
  state.voice = prefer || alt || anyEn || null;
  state.fallbackVoice = anyEn || null;
}

export function ensureReady(): Promise<void> {
  return new Promise(res => {
    if (speechSynthesis.getVoices().length) { pickVoice(); state.ready = true; return res(); }
    speechSynthesis.onvoiceschanged = () => { pickVoice(); state.ready = true; res(); };
    try { speechSynthesis.getVoices(); } catch {}
  });
}

function chunkText(text: string, maxLen: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const parts = clean
    .split(/([.?!;:])(?!\d)/)
    .reduce<string[]>((acc, cur) => {
      if (/[.?!;:]/.test(cur)) acc[acc.length - 1] += cur; else if (cur.trim()) acc.push(cur.trim());
      return acc;
    }, []);
  const chunks: string[] = [];
  let buf = '';
  for (const p of parts) {
    if ((buf + ' ' + p).trim().length <= maxLen) buf = (buf ? buf + ' ' : '') + p; else { if (buf) chunks.push(buf); buf = p; }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function randAround(base: number, spread: number) { return Math.max(0.5, base + (Math.random() * 2 - 1) * spread); }

function speakChunk(text: string, opts: { rate?: number; pitch?: number; volume?: number; voice?: SpeechSynthesisVoice | null; }): Promise<void> {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = opts.voice ?? state.voice;
    u.rate = opts.rate ?? state.cfg.baseRate;
    u.pitch = opts.pitch ?? state.cfg.basePitch;
    u.volume = opts.volume ?? state.cfg.volume;
    let started = false;
    const startTimer = setTimeout(() => {
      if (!started && state.fallbackVoice && u.voice !== state.fallbackVoice) {
        u.voice = state.fallbackVoice; speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    }, 900);
    u.onstart = () => { started = true; clearTimeout(startTimer); };
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export async function say(text: string) {
  if (!text || !text.trim()) return;
  speechSynthesis.cancel();
  await ensureReady();
  const chunks = chunkText(text, state.cfg.maxChunkChars);
  for (let i = 0; i < chunks.length; i++) {
    const rate = randAround(state.cfg.baseRate, state.cfg.varyRate);
    const pitch = randAround(state.cfg.basePitch, state.cfg.varyPitch);
    await speakChunk(chunks[i], { rate, pitch });
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, state.cfg.pauseMs));
  }
}

export function stop() { speechSynthesis.cancel(); }
export function setConfig(patch: Partial<LeeTtsConfig>) { Object.assign(state.cfg, patch || {}); localStorage.setItem('leeTtsCfg', JSON.stringify(state.cfg)); }
export function loadConfig() { try { const saved = localStorage.getItem('leeTtsCfg'); if (saved) setConfig(JSON.parse(saved)); } catch {} }
export function currentVoiceName() { return state.voice?.name || 'Default'; }

loadConfig();
