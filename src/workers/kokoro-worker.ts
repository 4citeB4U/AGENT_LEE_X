/// <reference lib="webworker" />
// Use the npm package bundled by Turbopack/Vite instead of relying on a CDN at runtime.
export {};

type InitMessage = { type: 'init'; payload?: { modelId?: string; dtype?: string } };
type ListMessage = { type: 'list' };
type GenerateMessage = { type: 'generate'; payload: { text: string; voice?: string; speed?: number } };
type InboundMessage = InitMessage | ListMessage | GenerateMessage;

type VoicesMessage = { type: 'voices'; voices: string[] };
type ReadyMessage = { type: 'ready' };
// Optionally include whether the TTS model loaded successfully.
type ReadyMessageWithModel = ReadyMessage & { modelLoaded?: boolean };
type ErrorMessage = { type: 'error'; error: string; debug?: unknown };
type AudioMessage = { type: 'audio'; sampleRate: number; channels: number; data: (ArrayBuffer | SharedArrayBuffer | Float32Array)[] };
type WavMessage = { type: 'wav'; buffer: ArrayBuffer | SharedArrayBuffer };
type OutboundMessage = VoicesMessage | ReadyMessage | ReadyMessageWithModel | ErrorMessage | AudioMessage | WavMessage;

type AudioBufferLike = {
  sampleRate: number;
  numberOfChannels: number;
  getChannelData: (c: number) => Float32Array;
};

type KokoroGenerateResult =
  | { audioBuffer?: AudioBufferLike; audio?: Float32Array | Float32Array[] | Uint8Array | ArrayBuffer | unknown; pcm?: Float32Array | Float32Array[]; sample_rate?: number; sampleRate?: number; wav?: ArrayBuffer | Blob | Uint8Array; buffer?: ArrayBuffer | Blob | Uint8Array; [k: string]: unknown }
  | ArrayBuffer
  | Blob
  | Uint8Array
  | string;

type KokoroModel = {
  list_voices?: () => string[];
  generate: (text: string, opts: { voice?: string; speed?: number }) => Promise<KokoroGenerateResult>;
};

let kokoroMod: any | null = null;
let kokoroModel: KokoroModel | null = null;
let postedReady = false;

async function ensureModel(modelId = 'onnx-community/Kokoro-82M-ONNX', dtype = 'q4') {
  if (kokoroModel) return true;
  try {
    if (!kokoroMod) await loadKokoro();
  } catch (e) {
    post({ type: 'error', error: 'engine_import_failed', debug: String(e) });
    return false;
  }
  try {
    if (kokoroMod && kokoroMod.KokoroTTS) {
      post({ type: 'ready', modelLoaded: false }); // signal model loading
      kokoroModel = await kokoroMod.KokoroTTS.from_pretrained(modelId, { dtype });
      post({ type: 'ready', modelLoaded: !!kokoroModel });
      return !!kokoroModel;
    }
  } catch (e) {
    post({ type: 'error', error: 'model_load_failed', debug: String(e) });
    return false;
  }
  return false;
}

async function loadKokoro(): Promise<any> {
  if (kokoroMod) return kokoroMod;
  // Load the browser/worker build from the CDN so bundlers won't try to bundle
  // kokoro internals. This keeps the repo TypeScript-only and avoids _next/lib/* 404s.
  try {
    // Try to import the kokoro web build via our proxy for COEP compatibility.
    // If that fails, fall back to the CDN URL.
    const proxied = '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js';
    const fallback = '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js';
    try {
      // @ts-ignore
      kokoroMod = await import(/* webpackIgnore: true */ proxied);
    } catch {
      // proxy unavailable or not mapped; fall back to CDN
      // @ts-ignore
      kokoroMod = await import(/* webpackIgnore: true */ fallback);
    }

    // Configure ONNX Runtime Web/WASM asset paths if available.
    try {
      const ort = kokoroMod?.ort;
      if (ort) {
        // prefer setWasmPaths if available
        const onnxBase = '/assets/cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
        try {
          if (typeof ort.setWasmPaths === 'function') {
            ort.setWasmPaths(onnxBase);
          }
        } catch {}
        // legacy style
        if (ort.env && ort.env.wasm) {
          ort.env.wasm.wasmPaths = onnxBase;
          ort.env.wasm.numThreads = 1;
        }
      }
    } catch {}

    return kokoroMod;
  } catch (e) {
    const err: ErrorMessage = { type: 'error', error: 'engine_import_failed', debug: String(e) };
    post(err);
    throw e;
  }
}

function post(msg: OutboundMessage, transfer?: Transferable[]) {
  try {
    if (transfer && transfer.length) self.postMessage(msg, transfer as any);
    else self.postMessage(msg);
  } catch (e) {
    try { self.postMessage(msg); } catch {}
  }
}

function toFloat32(arr: unknown): Float32Array | null {
  if (arr instanceof Float32Array) return arr;
  if (arr instanceof Int16Array) {
    const f = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) f[i] = arr[i] / 32768;
    return f;
  }
  if (arr instanceof Uint8Array) {
    const f = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) f[i] = (arr[i] - 128) / 128;
    return f;
  }
  if (arr && typeof arr === 'object' && (arr as any).buffer && (arr as any).byteLength !== undefined) {
    const view = arr as { buffer: ArrayBuffer; byteOffset?: number; byteLength: number };
    const u8 = new Uint8Array(view.buffer, view.byteOffset || 0, view.byteLength);
    const len = Math.floor(u8.byteLength / 2);
    const i16 = new Int16Array(len);
    for (let i = 0; i < len; i++) i16[i] = (u8[i * 2] | (u8[i * 2 + 1] << 8));
    return toFloat32(i16);
  }
  return null;
}

function parseWavToFloat32(buf: ArrayBuffer): { channels: Float32Array[]; sampleRate: number } | null {
  try {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    if (u8[0] !== 0x52 || u8[1] !== 0x49 || u8[2] !== 0x46 || u8[3] !== 0x46) return null;
    if (u8[8] !== 0x57 || u8[9] !== 0x41 || u8[10] !== 0x56 || u8[11] !== 0x45) return null;
    let pos = 12;
    let fmt: any | null = null;
    let dataOff = 0;
    let dataLen = 0;
    while (pos + 8 <= u8.length) {
      const size = dv.getUint32(pos + 4, true);
      const fourcc = String.fromCharCode(u8[pos], u8[pos + 1], u8[pos + 2], u8[pos + 3]);
      if (fourcc === 'fmt ') {
        fmt = {
          audioFormat: dv.getUint16(pos + 8, true),
          numChannels: dv.getUint16(pos + 10, true),
          sampleRate: dv.getUint32(pos + 12, true),
          bitsPerSample: dv.getUint16(pos + 22, true),
        };
      } else if (fourcc === 'data') {
        dataOff = pos + 8;
        dataLen = size;
        break;
      }
      pos += 8 + size + (size & 1);
    }
    if (!fmt || !dataOff || !dataLen) return null;
    const { audioFormat, numChannels, sampleRate, bitsPerSample } = fmt;
    const out: Float32Array[] = [];
    if (audioFormat === 1) {
      if (bitsPerSample === 16) {
        const frames = Math.floor(dataLen / (numChannels * 2));
        for (let ch = 0; ch < numChannels; ch++) out[ch] = new Float32Array(frames);
        let idx = dataOff;
        for (let i = 0; i < frames; i++) {
          for (let ch = 0; ch < numChannels; ch++) {
            const s = dv.getInt16(idx, true);
            idx += 2;
            out[ch][i] = s / 32768;
          }
        }
        return { channels: out, sampleRate };
      } else if (bitsPerSample === 8) {
        const frames = Math.floor(dataLen / numChannels);
        for (let ch = 0; ch < numChannels; ch++) out[ch] = new Float32Array(frames);
        let idx = dataOff;
        for (let i = 0; i < frames; i++) {
          for (let ch = 0; ch < numChannels; ch++) {
            const s = u8[idx++];
            out[ch][i] = (s - 128) / 128;
          }
        }
        return { channels: out, sampleRate };
      }
    } else if (audioFormat === 3 && bitsPerSample === 32) {
      const frames = Math.floor(dataLen / (numChannels * 4));
      for (let ch = 0; ch < numChannels; ch++) out[ch] = new Float32Array(frames);
      let idx = dataOff;
      for (let i = 0; i < frames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          out[ch][i] = dv.getFloat32(idx, true);
          idx += 4;
        }
      }
      return { channels: out, sampleRate };
    }
    return null;
  } catch {
    return null;
  }
}

function findPCMFloat32Arrays(obj: unknown, out: Float32Array[] = []): Float32Array[] {
  if (!obj) return out;
  if (obj instanceof Float32Array || obj instanceof Int16Array || (typeof obj === 'object' && (obj as any).buffer && (obj as any).byteLength !== undefined)) {
    const f = toFloat32(obj);
    if (f) out.push(f);
    return out;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) findPCMFloat32Arrays(v, out);
    return out;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      findPCMFloat32Arrays((obj as any)[k], out);
    }
  }
  return out;
}

function findSampleRate(obj: unknown): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (lk === 'sample_rate' || lk === 'samplerate' || lk === 'rate' || lk === 'sr') {
      const v = (obj as any)[k];
      return typeof v === 'number' ? v : Number(v) || null;
    }
  }
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (v && typeof v === 'object') {
      const r = findSampleRate(v);
      if (r) return r;
    }
  }
  return null;
}

function beepPCM(seconds = 1.0, sampleRate = 24000, freq = 440, volume = 0.22): Float32Array[] {
  const N = Math.max(1, Math.floor(seconds * sampleRate));
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = volume * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return [out];
}

self.onmessage = async (e: MessageEvent<InboundMessage>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      // Immediately signal that the worker is alive so the page can become interactive
      // while we load the heavy kokoro runtime/model in the background.
      try {
        // Post a quick ready with modelLoaded=false so UI can respond immediately.
        if (!postedReady) {
          post({ type: 'ready', modelLoaded: false });
          postedReady = true;
        }
      } catch (e) {
        // ignore
      }

  // We intentionally do NOT load the heavy model here to keep initial page
  // responsiveness fast. The model will be loaded lazily when the page
  // requests generation (on first 'generate' message).
  return;

      return;
    }

    if (msg.type === 'list') {
      let voices: string[] = [];
      try { voices = kokoroModel?.list_voices?.() || []; } catch {}
      if (!voices || !voices.length) voices = ['am_michael','am_fenrir','am_liam','am_eric','am_echo','am_onyx','af_sky'];
      post({ type: 'voices', voices });
      return;
    }

    if (msg.type === 'generate') {
      const { text, voice = 'am_michael', speed = 1.0 } = msg.payload;
      try {
        // Ensure the model/runtime is loaded (lazy-load on first generate)
        const ok = await ensureModel();
        if (!ok || !kokoroModel) {
          post({ type: 'error', error: 'model_not_loaded', debug: 'Kokoro runtime or model not available after ensureModel.' });
          return;
        }
        const res = await kokoroModel.generate(text, { voice, speed });
        if (res && typeof res === 'object' && (res as any).audioBuffer) {
          const ab = (res as any).audioBuffer as AudioBufferLike;
          const sampleRate = ab.sampleRate || 24000;
          const channels = ab.numberOfChannels || 1;
          const channelBuffers: ArrayBuffer[] = [];
          for (let c = 0; c < channels; c++) {
            const data = ab.getChannelData(c);
            const f32 = new Float32Array(data.length);
            f32.set(data);
            channelBuffers.push(f32.buffer);
          }
          post({ type: 'audio', sampleRate, channels, data: channelBuffers }, channelBuffers as any);
          return;
        }
        // fallback handling for other res shapes
        if (res && typeof res === 'object') {
          const floats = findPCMFloat32Arrays(res, []);
          const sr = findSampleRate(res) ?? 24000;
          if (floats.length) {
            const channelBuffers = floats.map(f => f.buffer.slice(0));
            post({ type: 'audio', sampleRate: sr, channels: floats.length, data: channelBuffers }, channelBuffers as any);
            return;
          }
        }
        if (res instanceof ArrayBuffer || (res as any)?.arrayBuffer) {
          const buf = res instanceof ArrayBuffer ? res : await (res as any).arrayBuffer();
          post({ type: 'wav', buffer: buf }, [buf]);
          return;
        }
        // if we reached here, return an error
        post({ type: 'error', error: 'unknown_generate_output', debug: typeof res === 'object' ? Object.fromEntries(Object.entries(res as any).slice(0, 8).map(([k, v]) => [k, typeof v])) : String(res) });
        return;
      } catch (e) {
        const pcm = beepPCM(0.6, 24000, 660, 0.22);
        const channelBuffers = pcm.map(c => c.buffer.slice(0));
        post({ type: 'audio', sampleRate: 24000, channels: pcm.length, data: channelBuffers }, channelBuffers as any);
        post({ type: 'error', error: 'generate_failed', debug: String(e) });
      }
      return;
    }
  } catch (err) {
    post({ type: 'error', error: String((err as any)?.message || err) });
  }
};
