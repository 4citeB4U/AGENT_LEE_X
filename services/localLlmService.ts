/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.LOCAL_LLM
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: bot
ICON_SIG: WSX-LOCAL-LLM
5WH: WHAT=Local LLM (OpenAI-compatible) client; WHY=Use local GGUF-backed servers like LM Studio / Ollama / llama.cpp; WHO=Leeway Core; WHERE=services/localLlmService.ts; WHEN=2025-10-27; HOW=TypeScript fetch wrapper
SPDX-License-Identifier: MIT
*/

import { LOCAL_LLM_MODEL, LOCAL_LLM_URL, USE_LOCAL_ONLY } from '../src/config';

export type ChatMessage = { role: 'system'|'user'|'assistant'; content: string };

const getBaseUrl = (): string => {
  // Allow runtime override via localStorage
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem('local_llm_url');
    if (ls) return ls;
  }
  return LOCAL_LLM_URL;
};

const getModel = (): string => {
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem('local_llm_model');
    if (ls) return ls;
  }
  return LOCAL_LLM_MODEL;
};

export async function isAvailable(): Promise<boolean> {
  try {
    const base = getBaseUrl().replace(/\/$/, '');
    // Quick probe using /v1/models if supported
    const url = `${base}/models`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function chatComplete(messages: ChatMessage[], params?: { temperature?: number; max_tokens?: number; model?: string }): Promise<string> {
  const base = getBaseUrl().replace(/\/$/, '');
  const body = {
    model: params?.model || getModel(),
    messages,
    temperature: params?.temperature ?? 0.7,
    max_tokens: params?.max_tokens ?? 1024,
    stream: false,
  } as const;

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Local LLM error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Local LLM returned no content.');
  return content;
}

export function setLocalLlmConfig(url: string, model?: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('local_llm_url', url);
    if (model) localStorage.setItem('local_llm_model', model);
  }
}

export function getLocalLlmConfig() {
  return { url: getBaseUrl(), model: getModel(), localOnly: USE_LOCAL_ONLY } as const;
}
