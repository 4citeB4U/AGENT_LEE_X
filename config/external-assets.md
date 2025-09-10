External assets scan and recommended hosting/proxy actions
=========================================================

Summary
-------

This file lists external hosts and specific URLs found in the repository and recommends whether to self-host, proxy, or leave as-is when enabling COEP/COOP or trying to make the app more robust.

Findings (high-level)
---------------------

- Kokoro runtime (kokoro-js) and onnxruntime-web are currently imported from jsDelivr in several places. These are critical for TTS startup under COEP and should be considered for proxying or self-hosting (WASM files and worker scripts).
- Several references to Hugging Face model endpoints appear in `models/` and `scripts/` (these are server-side and can remain remote; when used client-side they must be proxied).
- Some static imports in `test/` and `public/` reference other CDNs (vits-web via jsDelivr).
- README and package-lock reference external images and registries; those are documentation and lockfile references and can remain external.

Detailed list (by host)
-----------------------

- cdn.jsdelivr.net / jsdelivr.net
  - Paths found in: `src/workers/kokoro-worker.ts`, `src/lib/kokoro-tts.ts`, `src/types/remote.d.ts`, `types/global.d.ts`, `src/vendor/README.md`, `test/test-tts.html`.
  - Recommendation: Proxy all kokoro-js web build, onnxruntime-web dist and any WASM files via the `app/assets` proxy route (e.g. request /assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js).

- unpkg.com
  - Not directly referenced but included as an upstream candidate.
  - Recommendation: leave as candidate or add explicit mapping if you rely on it.

- huggingface.co / api-inference.huggingface.co
  - Paths found in: `models/azr.ts` (model file URLs), `scripts/embed-gemma.mjs` (inference API), `scripts/`.
  - Recommendation: model files served by HF (gguf etc) should remain remote for storage size reasons; proxy inference API calls through your server if you need to hide tokens or ensure COEP compatibility for browser use.

- raw.githubusercontent.com / githubusercontent
  - Occurs in README examples; treat as documentation.
  - Recommendation: not necessary to proxy unless you load raw assets client-side under COEP.

Suggested actions to prepare for COEP/COOP
-----------------------------------------

1. Use the `app/assets/[...path]/route.ts` proxy for critical runtime assets:
   - Add entries in `config/external-upstreams.ts` for hosts you want to proxy.
   - Update client code to request assets via `/assets/<host>/<path>`.
     Example: import kokoro from '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js'

2. Self-host WASM and worker files used by kokoro-js and onnxruntime-web where practical. If filesize is a concern, serve them from a controlled CDN or S3 bucket with the appropriate CORP/CORS headers.

3. For Hugging Face model downloads (gguf), keep server-side only. If you must load them in the browser, host a trimmed subset on a controlled origin and proxy through `/assets`.

4. Add a small audit job in CI to scan for external asset URLs (simple grep) and fail or warn if new disallowed hosts are introduced.

How to use the proxy
---------------------

- Example: To fetch `https://cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js` via the proxy, request:

  /assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js

- The proxy will consult `config/external-upstreams.ts` and attempt to fetch the matching upstream URL for that host.

Next steps
----------

- I can open PR changes that update the most important client-side imports to use the `/assets` proxy (kokoro-js, onnxruntime-web, vits-web in tests). Tell me to proceed and I will change the client imports and update any TS ambient module declarations to reference the proxied paths.
