declare module '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js' {
  const mod: any;
  export default mod;
  export = mod;
}

// Allow imports via the proxy path used by the app (/assets/host/...).
declare module '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js' {
  const mod: any;
  export default mod;
  export = mod;
}

declare module '/assets/cdn.jsdelivr.net/npm/onnxruntime-web/dist/' {
  const mod: any;
  export default mod;
  export = mod;
}

// Allow imports of the VITS-Web bundled build via the local asset proxy
declare module '/assets/cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@latest/dist/vits-web.js' {
  const mod: any;
  export default mod;
  export = mod;
}

// Allow esm.sh proxied bundles routed through /assets as a fallback path
declare module '/assets/esm.sh/@diffusionstudio/vits-web@latest?bundle' {
  const mod: any;
  export default mod;
  export = mod;
}
