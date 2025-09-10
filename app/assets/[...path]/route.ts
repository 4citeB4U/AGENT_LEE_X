import { NextRequest, NextResponse } from 'next/server';
import { EXTERNAL_UPSTREAMS, UPSTREAM_CANDIDATES } from '../../../config/external-upstreams';

function makeResponseFrom(upstreamRes: Response) {
  return (async () => {
    const body = new Uint8Array(await upstreamRes.arrayBuffer());
    const ct = upstreamRes.headers.get('content-type') ?? 'application/octet-stream';

    return new NextResponse(body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': upstreamRes.headers.get('cache-control') ?? 'public, max-age=3600',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Timing-Allow-Origin': '*',
      },
    });
  })();
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] }}) {
  const pathParts = params.path;
  if (!pathParts || pathParts.length === 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  // If the first path segment looks like a hostname, treat it as the upstream host.
  const first = pathParts[0];
  let tryUrls: string[] = [];

  if (first.includes('.')) {
    // client requested: /assets/<host>/<rest...>
    const host = first;
    const rest = pathParts.slice(1).join('/');

    // If we have a configured upstream for this host, use it.
    if (EXTERNAL_UPSTREAMS[host]) {
      tryUrls.push(EXTERNAL_UPSTREAMS[host] + rest);
    } else {
      // default to https://<host>/<rest>
      tryUrls.push(`https://${host}/${rest}`);
    }
  } else {
    // No explicit host in the path; try candidate upstreams in order.
    const joined = pathParts.join('/');
    for (const base of UPSTREAM_CANDIDATES) {
      tryUrls.push(base + joined);
    }
  }

  // Attempt to fetch the first reachable upstream URL.
  let lastErr: any = null;
  for (const url of tryUrls) {
    try {
      const upstreamRes = await fetch(url, {
        mode: 'cors',
        headers: { 'Accept': '*/*' },
        cache: 'no-store',
      });

      if (!upstreamRes.ok) {
        lastErr = new Error(`Upstream ${url} returned ${upstreamRes.status}`);
        continue;
      }

      return await makeResponseFrom(upstreamRes);
    } catch (err) {
      lastErr = err;
      // try next candidate
    }
  }

  // Nothing worked.
  const msg = lastErr ? String(lastErr) : 'Upstream fetch failed';
  return new NextResponse(msg, { status: 502 });
}
