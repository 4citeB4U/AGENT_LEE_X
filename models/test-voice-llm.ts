// test-voice-llm.ts
const logEl = document.getElementById('log') as HTMLPreElement;
const voiceTextEl = document.getElementById('voiceText') as HTMLInputElement;
const btnSpeakEl = document.getElementById('btnSpeak') as HTMLButtonElement;
const voiceSelectEl = document.getElementById('voiceSelect') as HTMLSelectElement;
const speedEl = document.getElementById('speed') as HTMLInputElement;
const userMsgEl = document.getElementById('userMsg') as HTMLInputElement;
const btnAskEl = document.getElementById('btnAsk') as HTMLButtonElement;
const chatOutEl = document.getElementById('chatOut') as HTMLTextAreaElement;
const btnSpeakAnswerEl = document.getElementById('btnSpeakAnswer') as HTMLButtonElement;
const wavFallbackEl = document.getElementById('wavFallback') as HTMLAudioElement;

let worker: Worker | null = null;
let workerReady = false;
let lastSpeakText = '';

function log(...args: unknown[]) {
  const line = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (logEl) {
    logEl.textContent += line + '\n';
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log(...args);
}

function initWorker() {
  if (worker) return;
  worker = new Worker('/kokoro-worker.js', { type: 'module' });
  worker.onmessage = (e: MessageEvent<any>) => {
    const { type, voices, error, data, sampleRate, channels, buffer, debug } = e.data || {};
    if (type === 'ready') {
      workerReady = true;
      log('Kokoro worker: ready');
      return;
    }
    if (type === 'voices') {
      populateVoices(voices || []);
      return;
    }
    if (type === 'audio') {
      playAudio(data as ArrayBuffer[], Number(sampleRate), Number(channels)).catch(err => log('Audio play error:', err));
      return;
    }
    if (type === 'wav') {
      playWav(buffer as ArrayBuffer).catch(err => log('WAV play error:', err));
      return;
    }
    if (type === 'error') {
      log('Worker error:', error, debug ? 'debug: ' + JSON.stringify(debug) : '');
      if (lastSpeakText) {
        try {
          const u = new SpeechSynthesisUtterance(lastSpeakText);
          u.rate = 0.95; u.pitch = 0.9;
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
        } catch { }
      }
    }
  };
  worker.postMessage({ type: 'init', payload: { modelId: 'onnx-community/Kokoro-82M-ONNX', dtype: 'q4' } });
}

async function requestVoices() {
  initWorker();
  const start = performance.now();
  const timeout = 15000;
  while (!workerReady && performance.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!workerReady) throw new Error('Worker not ready');
  worker!.postMessage({ type: 'list' });
}

function populateVoices(voices: string[]) {
  try {
    voiceSelectEl.innerHTML = '';
    const prefs = ['am_michael', 'am_fenrir', 'am_liam', 'am_eric', 'am_echo', 'am_onyx', 'af_sky'];
    const ordered = voices.filter(v => prefs.includes(v)).concat(voices.filter(v => !prefs.includes(v)));
    for (const v of ordered) {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      voiceSelectEl.appendChild(opt);
    }
    voiceSelectEl.value = ordered.includes('am_michael') ? 'am_michael' : ordered[0] || '';
    log('Kokoro voices:', ordered);
  } catch (e) {
    log('populateVoices failed:', e);
  }
}

async function speakKokoro(text: string, voice?: string, speed: number = 1.0) {
  initWorker();
  const start = performance.now();
  const timeout = 15000;
  while (!workerReady && performance.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!workerReady) {
    log('Worker not ready, fallback to browser speech');
    return false;
  }
  worker!.postMessage({ type: 'generate', payload: { text, voice: voice || 'am_michael', speed: Number(speed) || 1.0 } });
  return true;
}

function pcmToWavAB(channelsData: ArrayBuffer[], sampleRate: number, channels: number): ArrayBuffer {
  const sr = Math.max(8000, Math.min(96000, Number(sampleRate) || 24000));
  const ch = Math.max(1, Number(channels) || 1);
  const frames = new Float32Array(channelsData[0]).length;
  const bytesPerSample = 2;
  const blockAlign = ch * bytesPerSample;
  const byteRate = sr * blockAlign;
  const dataSize = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(buf);
  let p = 0;

  dv.setUint32(p, 0x52494646, false); p += 4;
  dv.setUint32(p, 36 + dataSize, true); p += 4;
  dv.setUint32(p, 0x57415645, false); p += 4;
  dv.setUint32(p, 0x666d7420, false); p += 4;
  dv.setUint32(p, 16, true); p += 4;
  dv.setUint16(p, 1, true); p += 2;
  dv.setUint16(p, ch, true); p += 2;
  dv.setUint32(p, sr, true); p += 4;
  dv.setUint32(p, byteRate, true); p += 4;
  dv.setUint16(p, blockAlign, true); p += 2;
  dv.setUint16(p, 16, true); p += 2;
  dv.setUint32(p, 0x64617461, false); p += 4;
  dv.setUint32(p, dataSize, true); p += 4;

  const outs: Float32Array[] = [];
  for (let c = 0; c < ch; c++) outs[c] = new Float32Array(channelsData[c]);

  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < ch; c++) {
      let s = Math.max(-1, Math.min(1, outs[c][i] || 0));
      s = s < 0 ? s * 32768 : s * 32767;
      dv.setInt16(p, s, true); p += 2;
    }
  }
  return buf;
}

async function playAudio(channelsData: ArrayBuffer[], sampleRate: number, channels: number) {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error('No AudioContext');
  const ctx = new AC();
  try {
    const first = new Float32Array(channelsData[0]);
    const frames = first.length;
    const sr = Math.max(8000, Math.min(96000, Number(sampleRate) || 24000));
    log('PCM debug:', { channels, frames, sampleRate: sr });
    const buffer = ctx.createBuffer(channels, frames, sr);
    for (let c = 0; c < channels; c++) {
      const f32 = new Float32Array(channelsData[c]);
      buffer.getChannelData(c).set(f32);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { }
    }
    src.start(0);
    await new Promise<void>(r => (src.onended = () => r()));
  } finally {
    try { await (ctx as AudioContext).close(); } catch { }
  }
}

{
  const _origPlay = playAudio;
  (playAudio as any) = async function (channelsData: ArrayBuffer[], sampleRate: number, channels: number) {
    try {
      return await _origPlay(channelsData, sampleRate, channels);
    } catch (err) {
      log('PCM path failed, falling back to WAV encode…');
      try {
        const wav = pcmToWavAB(channelsData, sampleRate, channels);
        await playWav(wav);
      } catch (e2) {
        log('PCM->WAV fallback failed:', e2);
        throw e2;
      }
    }
  };
}

async function playWav(arrBuf: ArrayBuffer) {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (AC) {
    try {
      const ctx = new AC();
      const bufCopy = arrBuf.slice(0);
      const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
        try {
          const p = (ctx as AudioContext).decodeAudioData(bufCopy as ArrayBuffer);
          if (p && typeof (p as any).then === 'function') {
            (p as any).then(resolve).catch(reject);
          } else {
            (ctx as AudioContext).decodeAudioData(bufCopy as ArrayBuffer, resolve, reject);
          }
        } catch (e) { reject(e); }
      });
      const src = (ctx as AudioContext).createBufferSource();
      src.buffer = decoded;
      src.connect((ctx as AudioContext).destination);
      src.start(0);
      await new Promise<void>(r => (src.onended = () => r()));
      await (ctx as AudioContext).close();
      return;
    } catch {
      log('decodeAudioData failed, falling back to <audio> element');
    }
  }
  const u8 = new Uint8Array(arrBuf);
  const blob = new Blob([u8], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  wavFallbackEl.src = url;
  await wavFallbackEl.play();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function mockLLM(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('benefit') || p.includes('advantages')) {
    return `In-browser AI keeps data local, reduces latency, avoids vendor lock-in, and works offline for certain tasks.\n\nIt’s ideal for privacy-sensitive workflows and fast UI feedback.`;
  }
  if (p.includes('summarize')) {
    return `Summary: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`;
  }
  if (p.includes('hello') || p.includes('howdy')) {
    return `Howdy! Agent Lee here. I’m on your device, ready to speak naturally and help with research.`;
  }
  return `I read: “${prompt}”. For this smoke test, I’m a tiny rule-based mock. We’ll switch to your real LLM endpoint next.`;
}

(async () => {
  try { await requestVoices(); } catch (e) { log('Voice request failed:', e); }
})();

btnSpeakEl.addEventListener('click', async () => {
  const text = (voiceTextEl.value || '').trim();
  let voice = voiceSelectEl.value || 'am_michael';
  const speed = Number(speedEl.value || '1.0');
  if (!text) return;
  log('Speaking with Kokoro…', { voice, speed });
  lastSpeakText = text;
  const ok = await speakKokoro(text, voice, speed);
  if (!ok) {
    log('Falling back to browser speech…');
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { }
  }
});

btnAskEl.addEventListener('click', () => {
  const q = (userMsgEl.value || '').trim();
  if (!q) return;
  const ans = mockLLM(q);
  chatOutEl.value = ans;
  log('Mock LLM answer ready.');
});

btnSpeakAnswerEl.addEventListener('click', async () => {
  const ans = (chatOutEl.value || '').trim();
  if (!ans) return;
  const voice = voiceSelectEl.value || 'am_michael';
  const speed = Number(speedEl.value || '1.0');
  const ok = await speakKokoro(ans, voice, speed);
  if (!ok) {
    try {
      const u = new SpeechSynthesisUtterance(ans);
      u.rate = 0.95; u.pitch = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { }
  }
});
