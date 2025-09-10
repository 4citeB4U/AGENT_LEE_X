import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface GoogleRequestBody {
  text: string;
  voiceName?: string;
  languageCode?: string;
  audioEncoding?: "MP3" | "OGG_OPUS" | "LINEAR16";
  speakingRate?: number;
  pitch?: number;
}

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_TTS_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing GOOGLE_TTS_KEY" }, { status: 500 });
    }

    const {
      text,
      voiceName = "en-US-Neural2-I",
      languageCode = "en-US",
      audioEncoding = "MP3",
      speakingRate,
      pitch,
    } = (await req.json()) as GoogleRequestBody;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;
    const payload: Record<string, any> = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding },
    };
    if (speakingRate !== undefined) payload.audioConfig.speakingRate = speakingRate;
    if (pitch !== undefined) payload.audioConfig.pitch = pitch;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return NextResponse.json({ error: "Google TTS error", detail }, { status: resp.status });
    }

    const data = (await resp.json()) as { audioContent?: string };
    if (!data.audioContent) {
      return NextResponse.json({ error: "Missing audio content in response" }, { status: 500 });
    }

    const buf = Buffer.from(data.audioContent, "base64");
    let mime: string;
    switch (audioEncoding) {
      case "OGG_OPUS":
        mime = "audio/ogg";
        break;
      case "LINEAR16":
        mime = "audio/wav";
        break;
      default:
        mime = "audio/mpeg";
    }

    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Google TTS failed" }, { status: 500 });
  }
}
