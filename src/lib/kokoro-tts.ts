"use client";

// Free, browser-only neural TTS via Kokoro.js from CDN (no API keys)
// Docs: https://www.npmjs.com/package/kokoro-js (we import the web build via CDN)

export type KokoroOptions = {
  voice?: string;   // e.g., "am_mk", "am_mars", "af_sky", "bf_ava"
  speed?: number;   // 0.5..2.0
  dtype?: "q8" | "q4" | "fp16"; // quantization (smaller -> faster)
  modelId?: string; // default: onnx-community/Kokoro-82M-ONNX
};

let kokoroModel: any | null = null;

async function ensureModel(modelId = "onnx-community/Kokoro-82M-ONNX", dtype: KokoroOptions["dtype"] = "q4") {
  if (typeof window === "undefined") return null;
  if (kokoroModel) return kokoroModel;
  // Load kokoro-js web build via the assets proxy so COEP/COOP can be supported.
  // If the proxy is not available, fall back to the CDN URL.
  const proxied = `/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js`;
  const fallback = `/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js`;
  let mod: any;
  try {
    mod = await (Function('return import("' + proxied + '")')());
  } catch (e) {
    // proxy may not be configured; gracefully fall back to CDN
    mod = await (Function('return import("' + fallback + '")')());
  }
  try {
    // If the page is cross-origin isolated (SharedArrayBuffer allowed) we can enable multiple WASM threads
    // which improves generation speed on multi-core devices. Otherwise fall back to 1 thread for compatibility.
    const canUseSAB = typeof (globalThis as any).crossOriginIsolated === 'boolean' ? (globalThis as any).crossOriginIsolated : false;
    if (mod?.ort?.env?.wasm) {
      try {
        const hw = (navigator && (navigator as any).hardwareConcurrency) ? (navigator as any).hardwareConcurrency : 1;
        if (canUseSAB && hw && hw > 1) {
          // use all but one core to keep UI responsive
          mod.ort.env.wasm.numThreads = Math.max(1, hw - 1);
        } else {
          mod.ort.env.wasm.numThreads = 1;
        }
      } catch (e) {
        mod.ort.env.wasm.numThreads = 1;
      }
    }
  } catch {}
  kokoroModel = await mod.KokoroTTS.from_pretrained(modelId, { dtype });
  return kokoroModel;
}

export async function warmKokoro() {
  try { await ensureModel(); } catch {}
}

export async function listKokoroVoices(): Promise<string[]> {
  const model = await ensureModel();
  if (!model) return [];
  try {
    const arr = model.list_voices?.();
    if (Array.isArray(arr)) return arr as string[];
  } catch {}
  return [];
}

export async function speakKokoro(text: string, opts: KokoroOptions = {}): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    const model = await ensureModel(opts.modelId, opts.dtype ?? "q4");
    if (!model) return false;
    const res = await model.generate(text, {
      voice: opts.voice ?? "am_michael",
      speed: opts.speed ?? 1.0,
    });
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createBufferSource();
    src.buffer = res.audioBuffer as AudioBuffer;
    src.connect(ctx.destination);
    src.start(0);
    await new Promise<void>((resolve) => { src.onended = () => resolve(); });
    return true;
  } catch (e) {
    console.warn("Kokoro synth failed", e);
    return false;
  }
}

export async function speakKokoroPreferred(text: string, preferredVoices: string[]): Promise<boolean> {
  const available = await listKokoroVoices();
  const ordered = preferredVoices.filter(v => available.includes(v));
  const candidates = ordered.length ? ordered : available;
  for (const v of candidates) {
    const ok = await speakKokoro(text, { voice: v });
    if (ok) return true;
  }
  // final fallback
  return speakKokoro(text, { voice: 'am_michael' });
}
