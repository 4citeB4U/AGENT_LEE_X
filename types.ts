/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: types.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\types.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

/* LEEWAY HEADER — DO NOT REMOVE
REGION: TYPES.CORE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=type ICON_SIG=CD534113
5WH: WHAT=Core TypeScript type definitions; WHY=Type safety for Agent Lee; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\types.ts; WHEN=2025-10-05; HOW=TypeScript interfaces
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

export type Feature = "research" | "text" | "analyze" | "document" | "call" | "email" | "notepad" | "settings" | "character"; // tasks removed from tabs; keep union stable if not previously included

export type Role = "user" | "model";

// ChatMsg is used by the CommunicationControl component
export type ChatMsg = {
  role: Role;
  parts: string;
};

// ADDED: Centralized type for transmission log entries
export type TransmissionLogEntry = {
    id: number;
    speaker: 'USER' | 'AGENT' | 'SYSTEM';
    text: string;
    timestamp: string; // ISO 8601 string format
};


export type ResearchMode = "general" | "academic" | "wikipedia";

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

// --- New Note Types for Centralized Notepad ---

export type NoteContent =
  | { type: 'text'; text: string; audioData?: { base64: string; mimeType: string; }; isEncrypted?: boolean; iv?: string; salt?: string; }
  | { type: 'image'; imageUrl: string; prompt: string; }
  | { type: 'research'; text: string; sources: GroundingChunk[]; }
  | { type: 'analysis'; text: string; fileName?: string; audioData?: { base64: string; mimeType: string; }; isEncrypted?: boolean; iv?: string; salt?: string; }
  | { type: 'call'; text: string; callDetails: string; audioData?: { base64: string; mimeType: string; }; isEncrypted?: boolean; iv?: string; salt?: string; }
  // NEW: Added a 'memory' type to store conversations for the RAG system.
  | { type: 'memory'; userPrompt: string; agentResponse: string; };

export interface Note {
  id: number;
  title: string;
  date: string;
  tag: string;
  content: NoteContent;
}

// --- Types for Multi-Engine Image Generation ---

export type GenReq = { prompt: string; seed?: number; size?: [number, number]; steps?: number };

export type GenOut =
  | { type:'rgba'; data: Uint8ClampedArray; width:number; height:number }
  | { type:'blob'; data: Blob }
  | { type:'base64'; data: string }; // data is base64 string without data:image/... prefix

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

// NEW: Type for contacts stored in localStorage
export interface Contact {
    id: number;
    name: string;
    phone: string;
}

// NEW: Character type for the Character Studio
export interface Character {
  id: number;
  name: string;
  appearance: string; // For image generation consistency
  personality: string; // For text generation consistency
  avatarUrl?: string; // Base64 data URL
  referenceImageUrl?: string; // Reference image URL for character consistency
  createdAt: string; // ISO 8601 string
}

// NEW: Type for the call queue
export interface CallQueueItem {
  number: string;
  purpose: string;
}