import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOP = 'same-origin';
const COEP = 'require-corp';

// List of passthrough prefixes that should not receive the security headers.
const passThrough = [
  '/api/health',
  // add more as needed
];

export function middleware(req: NextRequest) {
  const enable = process.env.NEXT_ENABLE_COOP_COEP === '1' || process.env.NEXT_PUBLIC_FORCE_COOP === '1';
  const url = req.nextUrl;
  const res = NextResponse.next();

  if (!enable) return res;

  if (passThrough.some(p => url.pathname.startsWith(p))) return res;

  // App-wide isolation headers
  res.headers.set('Cross-Origin-Opener-Policy', COOP);
  res.headers.set('Cross-Origin-Embedder-Policy', COEP);

  // Helpful defaults to harden the surface area
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static/chunks/webpack-hmr).*)'],
};
