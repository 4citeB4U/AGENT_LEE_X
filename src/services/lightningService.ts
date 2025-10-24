/*
TAG: SERVICE.LIGHTNING
WHAT: Minimal Lightning AI proxy client for browser usage.
NOTE: This expects a public HTTPS endpoint (your Lightning Space/App) that accepts
      a Bearer token or runs open for read-only infer. For private endpoints,
      prefer routing via a server/worker and keep tokens server-side.
*/

export interface LightningGenReq { prompt: string; size?: [number, number]; seed?: number }

const BASE_URL = (process.env.LIGHTNING_BASE_URL || '').replace(/\/$/, '');
const TOKEN    = process.env.LIGHTNING_API_TOKEN || '';

export async function available(): Promise<boolean> {
  return !!BASE_URL; // token optional if endpoint is public; recommended to set
}

export async function generateImageWithLightning(prompt: string): Promise<string> {
  if (!BASE_URL) throw new Error('LIGHTNING_BASE_URL is not configured');
  const url = `${BASE_URL}/predict`;
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const body = { prompt };
  const res = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Lightning request failed: ${res.status}`);
  // Expect response: { image: "data:image/...;base64,..." } or direct dataUrl string
  const data = await res.json().catch(() => null);
  const dataUrl: string = typeof data === 'string' ? data : (data?.image || data?.result || '');
  if (!dataUrl?.startsWith('data:image')) throw new Error('Invalid image response from Lightning');
  return dataUrl;
}
