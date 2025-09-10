# External Asset Audit (Client → First-Party)

All client-side CDN URLs are rewritten to `/assets/<host>/<path>` and served with CORP/CORS from our origin.

- Disallowed client hosts: `scripts/forbidden-hosts.txt`
- Proxy route: `src/app/assets/[...path]/route.ts`
  - Adds `Cross-Origin-Resource-Policy: cross-origin`
  - Adds `Access-Control-Allow-Origin: *`
  - Preserves `Content-Type`; optional per-host TTL
- Server-side URLs (models/env/HF) remain unchanged by design.
- To add a vendor asset: reference via `/assets/<host>/<path>`; extend the proxy if special MIME/TTL is needed.
# External Asset Audit

All client-side CDN URLs should be rewritten to first-party `/assets/<host>/<path>` and proxied via the app route.

## Disallowed client hosts
See `scripts/forbidden-hosts.txt` for the canonical list.

## Proxy route
The proxy route `app/assets/[...path]/route.ts` serves client assets with CORP/CORS-friendly headers. If an upstream requires special MIME or caching, extend the allowlist in the route.

## Exceptions
Server-side downloads (model files, API calls) are intentionally left unchanged.

## Adding new vendor assets
1. Reference via `/assets/<host>/<path>`.
2. If needed, add per-host rules in the proxy for content-type or cache.
