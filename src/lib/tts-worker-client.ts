/* Workerized Kokoro TTS client for the app */

let worker: Worker | null = null;
let ready = false;

function init() {
  if (typeof window === 'undefined') return;
  if (worker) return;
  worker = new Worker('/kokoro-worker.js', { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const { type } = (e.data || {}) as any;
    if (type === 'ready') ready = true;
  };
  worker.postMessage({ type: 'init', payload: { modelId: 'onnx-community/Kokoro-82M-ONNX', dtype: 'q4' } });
}

export async function speakViaWorker(text: string, voice = 'am_michael', speed = 0.95): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    init();
    const start = performance.now();
    const timeout = 15000;
    while (!ready && performance.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 50));
    }
    if (!ready || !worker) return false;

    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();

    const onMsg = async (e: MessageEvent) => {
      const { type, data, sampleRate, channels, buffer } = e.data || {};
      if (type === 'audio') {
        worker?.removeEventListener('message', onMsg as any);
        try {
          const frames = (data && data[0]) ? new Float32Array(data[0]).length : 0;
          const sr = Math.max(8000, Math.min(96000, Number(sampleRate) || 24000));
          const audioBuf = ctx.createBuffer(channels || 1, frames, sr);
          for (let c = 0; c < (channels || 1); c++) {
            const f32 = new Float32Array(data[c]);
            audioBuf.getChannelData(c).set(f32);
          }
          const src = ctx.createBufferSource(); src.buffer = audioBuf; src.connect(ctx.destination);
          if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
          src.start(0);
          await new Promise(r => (src.onended = r));
          try { await ctx.close(); } catch {}
        } catch (err) {
          try { await ctx.close(); } catch {}
        }
      }
      if (type === 'wav') {
        worker?.removeEventListener('message', onMsg as any);
        try {
          const buf = (buffer as ArrayBuffer) || new ArrayBuffer(0);
          const decoded: AudioBuffer = await new Promise((resolve, reject) => {
            try {
              const p: any = ctx.decodeAudioData(buf.slice(0));
              if (p && typeof p.then === 'function') { p.then(resolve).catch(reject); }
              else { (ctx as any).decodeAudioData(buf.slice(0), resolve, reject); }
            } catch (e) { reject(e); }
          });
          const src = ctx.createBufferSource(); src.buffer = decoded; src.connect(ctx.destination);
          if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
          src.start(0);
          await new Promise(r => (src.onended = r));
          try { await ctx.close(); } catch {}
        } catch (err) {
          try { await ctx.close(); } catch {}
        }
      }
    };

    worker.addEventListener('message', onMsg as any);
    worker.postMessage({ type: 'generate', payload: { text, voice, speed } });
    return true;
  } catch {
    return false;
  }
}
