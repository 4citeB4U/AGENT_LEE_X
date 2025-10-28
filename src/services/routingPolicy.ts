/*
LEEWAY HEADER — DO NOT REMOVE
TAG: CORE.SERVICES.ROUTING_POLICY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: route
ICON_SIG: CD534113
5WH: WHAT=Deterministic provider selection; WHY=Predictable engine choice + local-only honor; WHO=Leeway Core; WHERE=src/services/routingPolicy.ts; WHEN=2025-10-28; HOW=TypeScript
SPDX-License-Identifier: MIT
*/

import { USE_LOCAL_ONLY } from '../config';
import { getProviders, type ProviderName, type ProviderConfig } from './providerRegistry';

function isLocalOnly(): boolean {
  try {
    const runtime = typeof localStorage !== 'undefined' && localStorage.getItem('local_only') === 'true';
    const global = typeof window !== 'undefined' && Boolean((window as any).__LOCAL_ONLY__);
    return Boolean(USE_LOCAL_ONLY || runtime || global);
  } catch {
    return Boolean(USE_LOCAL_ONLY);
  }
}

function pickFirstEnabled(list: ProviderConfig[], names: ProviderName[]): ProviderName | null {
  for (const n of names) {
    const p = list.find(x => x.provider === n);
    if (p && (p.enabled ?? false)) return n;
  }
  return null;
}

export type TaskKind = 'text' | 'vision' | 'image' | 'embed';

export interface SelectionInput {
  kind: TaskKind;
  hints?: string[]; // e.g., ['prefer:gemini', 'deterministic']
}

export function selectProvider(input: SelectionInput): ProviderName {
  const localOnly = isLocalOnly();
  const providers = getProviders();

  // Hints can request a provider explicitly
  const prefer = input.hints?.find(h => h.startsWith('prefer:'))?.split(':')[1] as ProviderName | undefined;
  if (prefer) {
    const exists = providers.find(p => p.provider === prefer && (p.enabled ?? false));
    if (exists) return prefer;
  }

  // Policy: local-first; if local-only, force local
  if (localOnly) return 'local';

  // If local LLM is configured, still prefer it for text/vision to reduce cost
  if (input.kind === 'text' || input.kind === 'vision') {
    const local = providers.find(p => p.provider === 'local');
    if (local && (local.enabled ?? true) && (local.baseUrl || '').length > 0) return 'local';
  }

  // Next: gemini → openai → cloudflare
  const chain: ProviderName[] = ['gemini', 'openai', 'cloudflare'];
  return pickFirstEnabled(providers, chain) || 'local';
}

export function getBaseUrlFor(provider: ProviderName): string | undefined {
  const p = getProviders().find(x => x.provider === provider);
  return p?.baseUrl;
}
