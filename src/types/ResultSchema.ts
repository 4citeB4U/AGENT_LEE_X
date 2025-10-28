/*
LEEWAY HEADER — DO NOT REMOVE
TAG: CORE.TYPES.RESULT_SCHEMA
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: square-equal
ICON_SIG: CD534113
5WH: WHAT=Unified Agent result schema; WHY=Deterministic UI contract; WHO=Leeway Core; WHERE=src/types/ResultSchema.ts; WHEN=2025-10-28; HOW=TypeScript types
SPDX-License-Identifier: MIT
*/

export type AgentResultType =
  | 'answer'
  | 'plan'
  | 'code'
  | 'vision'
  | 'media_request'
  | 'retrieval';

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AgentSource {
  title: string;
  url: string;
}

export interface AgentResult {
  type: AgentResultType;
  title?: string;
  content: string | Record<string, unknown>;
  sources?: AgentSource[];
  tool_calls?: AgentToolCall[];
  error?: string;
}
