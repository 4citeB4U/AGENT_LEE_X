"use client";

// Frontend-only VITS-Web wrapper that loads from CDN at runtime to avoid
// bundler resolving Node core modules from the npm package.
// Usage:
//   await ensureVoiceDownloaded('en_US-hfc_male-medium');
//   await speakVits("Hello world", 'en_US-hfc_male-medium');

let vits: any | null = null;
let downloadedVoices: Record<string, boolean> = {};

async function getVits() {
  if (vits) return vits;
  if (typeof window === 'undefined') return null;
  try {
    // IMPORTANT: load a fully bundled ESM build so there are no bare specifiers
    // esm.sh will pre-bundle dependencies like onnxruntime-web for us.
    // Keeping it runtime-only via Function(import()) avoids bundling by Next.
    const proxied = '/assets/cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@latest/dist/vits-web.js';
    const url = '/assets/esm.sh/@diffusionstudio/vits-web@latest?bundle';
    try {
      vits = await (Function('return import("' + proxied + '")')());
    } catch (e) {
      vits = await (Function(`return import("${url}")`)());
    }
    return vits;
  } catch (e) {
    console.warn('[VITS-Web] CDN import failed, falling back to speechSynthesis.', e);
    return null;
  }
}

export async function ensureVoiceDownloaded(voiceId: string, onProgress?: (pct: number) => void) {
  const lib = await getVits();
  if (!lib) return false;
  if (downloadedVoices[voiceId]) return true;
  try {
    await lib.download(voiceId, (progress: { url: string; loaded: number; total: number }) => {
      const pct = progress.total ? Math.round((progress.loaded * 100) / progress.total) : 0;
      onProgress?.(pct);
    });
    downloadedVoices[voiceId] = true;
    return true;
  } catch (e) {
    console.error('[VITS-Web] download failed for', voiceId, e);
    return false;
  }
}

export async function speakVits(text: string, voiceId: string, onProgress?: (pct: number) => void) {
  const lib = await getVits();
  if (!lib) return false;
  try {
    if (!downloadedVoices[voiceId]) {
      const ok = await ensureVoiceDownloaded(voiceId, onProgress);
      if (!ok) return false;
    }
    const wav: Blob = await lib.predict({ text, voiceId });
    const audio = new Audio();
    audio.src = URL.createObjectURL(wav);
    await audio.play();
    return true;
  } catch (e) {
    console.error('[VITS-Web] predict/play failed', e);
    return false;
  }
}

// High-level helper that tries a preferred voice list in order, then falls back
export async function speakVitsPreferred(text: string, preferredVoices: string[]) {
  for (const id of preferredVoices) {
    const ok = await speakVits(text, id);
    if (ok) return true;
  }
  return false;
}
