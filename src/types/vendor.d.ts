// Minimal shim so TypeScript accepts the vendored kokoro browser bundle import.
// This file declares the relative module specifier used by the worker:
//  import('../vendor/kokoro.web.js')

declare module '../vendor/kokoro.web.js' {
  const mod: any;
  export default mod;
}

// Also allow the sibling relative path in other contexts.
declare module '../../vendor/kokoro.web.js' {
  const mod: any;
  export default mod;
}
