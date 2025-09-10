import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface AzureRequestBody {
  text: string;
  voiceName?: string;
  format?: string;
  style?: string;
  rate?: string;
  pitch?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mimeForFormat(fmt: string) {
  if (fmt.includes("mp3")) return "audio/mpeg";
  if (fmt.includes("ogg")) return "audio/ogg";
  if (fmt.includes("webm")) return "audio/webm";
  if (fmt.includes("wav")) return "audio/wav";
  return "application/octet-stream";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const region = process.env.AZURE_TTS_REGION || "eastus";
  const key = process.env.AZURE_TTS_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Azure TTS is not configured. Set AZURE_TTS_KEY and AZURE_TTS_REGION." },
      { status: 500 }
    );
  }

  let body: AzureRequestBody;
  try {
    body = (await req.json()) as AzureRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, voiceName = "en-US-JasonNeural", format = "audio-48khz-192kbitrate-mono-mp3", style, rate, pitch } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${rate ?? '0%'}" pitch="${pitch ?? '0Hz'}">
      ${style ? `<mstts:express-as style="${style}">${escapeXml(text)}</mstts:express-as>` : escapeXml(text)}
    </prosody>
  </voice>
</speak>`.trim();

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": format,
      "User-Agent": "AgentLee-TTS/1.0",
      Accept: "*/*",
    },
    body: ssml,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json({ error: "Azure TTS error", detail }, { status: resp.status });
  }

  const audioBuffer = await resp.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": mimeForFormat(format),
      "Cache-Control": "no-store",
    },
  });
}
