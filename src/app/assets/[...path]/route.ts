import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHEABLE = new Set<string>();

export async function GET(_req: NextRequest, ctx: { params: { path?: string[] }}) {
  const parts = ctx.params.path ?? [];
  const [host, ...rest] = parts;
  if (!host) {
    return NextResponse.json({ error: 'missing host' }, { status: 400 });
  }

  const upstream = `https://${host}/${rest.join('/')}`;
  const ures = await fetch(upstream, { cache: 'no-store' });
  const body = new Uint8Array(await ures.arrayBuffer());
  const ct = ures.headers.get('content-type') ?? 'application/octet-stream';

  const headers: Record<string, string> = {
    'Content-Type': ct,
    'Access-Control-Allow-Origin': '*',
    'Timing-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
  if (CACHEABLE.has(host)) headers['Cache-Control'] = 'public, max-age=3600';

  return new NextResponse(body, { status: ures.status, headers });
}
