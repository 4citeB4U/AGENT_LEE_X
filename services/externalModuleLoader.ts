/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.MODULE_LOADER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: plug
ICON_SIG: WSX-MOD-LOADER
5WH: WHAT=Load optional browser JS LLM modules; WHY=Enable azr/gemma/llama/phi3/embedder via script injection; WHO=Leeway Core; WHERE=services/externalModuleLoader.ts; WHEN=2025-10-27; HOW=dynamic module script injection
SPDX-License-Identifier: MIT
*/

export async function loadOptionalModules(urls: string[]): Promise<void> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const loaders = unique.map((url) => new Promise<void>((resolve) => {
    const el = document.createElement('script');
    el.type = 'module';
    el.src = url;
    el.async = true;
    el.onload = () => { console.info('[module-loader] loaded', url); resolve(); };
    el.onerror = () => { console.warn('[module-loader] failed', url); resolve(); };
    document.head.appendChild(el);
  }));
  await Promise.allSettled(loaders);
}

export function defaultLlmModuleUrls(base = '/llm-modules') {
  const clean = base.replace(/\/$/, '');
  return [
    `${clean}/azr.js`,
    `${clean}/phi3.js`,
    `${clean}/gemma.js`,
    `${clean}/llama.js`,
    `${clean}/embedder.js`,
    `${clean}/azr_modules_combined.js`,
  ];
}

// Also support modules dropped under /models for convenience
export function defaultModelModuleUrls(base = '/models') {
  const clean = base.replace(/\/$/, '');
  return [
    `${clean}/azr.js`,
    `${clean}/phi3.js`,
    `${clean}/gemma.js`,
    `${clean}/llama.js`,
    `${clean}/embedder.js`,
    `${clean}/azr_modules_combined.js`,
  ];
}
