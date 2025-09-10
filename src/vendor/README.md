Vendor directory for browser-only prebuilt bundles used by workers.

This project expects `src/vendor/kokoro.web.js` to be present for the Kokoro
browser/worker runtime. For security and reproducibility we don't fetch
third-party runtime bundles automatically during repository edits.

To download the Kokoro browser bundle into the expected location, run (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path src\vendor | Out-Null
Invoke-WebRequest `
  -Uri https://cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js `
  -OutFile src\vendor\kokoro.web.js
```

After placing `kokoro.web.js` here, the worker at `src/workers/kokoro-worker.ts`
will import it via `import('../vendor/kokoro.web.js')`, which is compatible with
TypeScript (we provide the ambient types in `src/types/vendor.d.ts`).

Note: do NOT commit `src/vendor/kokoro.web.js` with secrets or build artifacts in public repos.
