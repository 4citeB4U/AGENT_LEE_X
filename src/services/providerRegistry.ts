/*
LEEWAY HEADER — DO NOT REMOVE
TAG: CORE.SERVICES.PROVIDER_REGISTRY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: plug
ICON_SIG: CD534113
5WH: WHAT=Provider registry for engines; WHY=Centralize provider enablement & base URLs; WHO=Leeway Core; WHERE=src/services/providerRegistry.ts; WHEN=2025-10-28; HOW=TypeScript service
SPDX-License-Identifier: MIT
*/

export type ProviderName = 'local' | 'gemini' | 'openai' | 'cloudflare';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey?: string; // undefined => disabled
  baseUrl?: string; // optional (proxy)
  enabled?: boolean; // computed
}

const ss = (k: string) => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(k) || '' : '');

export function getProviders(): ProviderConfig[] {
  const gemini = ss('gemini_api_key');
  const openai = ss('openai_api_key');
  const cf = ss('cf_api_token');

  return [
    { provider: 'local', enabled: true, baseUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem('local_llm_url') : '') || '' },
    { provider: 'gemini', apiKey: gemini, baseUrl: '/gemini', enabled: !!gemini },
    { provider: 'openai', apiKey: openai, baseUrl: '/api/chat', enabled: !!openai },
    { provider: 'cloudflare', apiKey: cf, baseUrl: '/api/chat', enabled: !!cf },
  ];
}
