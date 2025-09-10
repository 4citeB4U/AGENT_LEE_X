/// <reference lib="webworker" />
// Ambient declarations for optional native modules and worker globals

declare module '@wllama/wllama';
declare module '@wllama/wllama/esm/index.js';
declare module '@xenova/transformers';
declare module 'https://cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js';
// Allow imports routed through the local asset proxy for COEP/COOP compatibility
declare module '/assets/cdn.jsdelivr.net/npm/kokoro-js@1/dist/kokoro.web.js';
// VITS-Web proxied build
declare module '/assets/cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@latest/dist/vits-web.js';
declare module '@wllama/wllama/esm/single-thread/wllama.wasm';
declare module '@wllama/wllama/esm/multi-thread/wllama.wasm';
declare module '@wllama/wllama/esm/multi-thread/wllama.worker.mjs';

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;

export {};
