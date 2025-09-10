"use client";

// Client helpers to call our server-side premium TTS endpoints (Azure primary, Google fallback)

export type AzureVoice = string;

type AzureOptions = {
  voiceName?: AzureVoice;
  format?: string; // e.g., 'audio-48khz-192kbitrate-mono-mp3'
  style?: string;  // e.g., 'narration-relaxed', 'general', 'empathetic'
  rate?: string;   // e.g., '-10%'
  pitch?: string;  // e.g., '-2Hz'
};

export async function speakAzure(text: string, opts: AzureOptions = {}): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    const resp = await fetch("/api/tts/azure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceName: opts.voiceName ?? "en-US-GuyNeural",
        format: opts.format ?? "audio-48khz-192kbitrate-mono-mp3",
        style: opts.style ?? "narration-relaxed",
        rate: opts.rate ?? "-10%",
        pitch: opts.pitch ?? "-2Hz",
      }),
    });
    if (!resp.ok) {
      let err: any = null;
      try { err = await resp.json(); } catch {
        try { err = await resp.text(); } catch { err = null; }
      }
      console.error(`Azure TTS error (status ${resp.status})`, err);
      return false;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    return true;
  } catch (e) {
    console.error("Azure TTS request failed", e);
    return false;
  }
}

type GoogleOptions = {
  voiceName?: string;
  languageCode?: string;
  audioEncoding?: "MP3" | "OGG_OPUS" | "LINEAR16";
  speakingRate?: number;
  pitch?: number;
};

export async function speakGoogle(text: string, opts: GoogleOptions = {}): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    const resp = await fetch("/api/tts/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceName: opts.voiceName ?? "en-US-Neural2-I",
        languageCode: opts.languageCode ?? "en-US",
        audioEncoding: opts.audioEncoding ?? "MP3",
        speakingRate: opts.speakingRate ?? 0.9,
        pitch: opts.pitch ?? -2,
      }),
    });
    if (!resp.ok) {
      let err: any = null;
      try { err = await resp.json(); } catch {
        try { err = await resp.text(); } catch { err = null; }
      }
      console.error(`Google TTS error (status ${resp.status})`, err);
      return false;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    return true;
  } catch (e) {
    console.error("Google TTS request failed", e);
    return false;
  }
}

export async function speakHuman(text: string): Promise<boolean> {
  // Try Azure (preferred Southern male), then Google, then browser fallback
  const okAzure = await speakAzure(text);
  if (okAzure) return true;
  const okGoogle = await speakGoogle(text);
  if (okGoogle) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 0.9; u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }
  return false;
}
