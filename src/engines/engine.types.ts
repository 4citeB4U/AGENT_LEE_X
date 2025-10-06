/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: engine.types.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\engines\engine.types.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// D:\AGENT_LEE_X\src\engines\engine.types.ts

export type GenReq = { 
  prompt: string; 
  seed?: number; 
  size?: [number, number]; 
  steps?: number 
};

export type GenOut =
  | { type: 'rgba'; data: Uint8ClampedArray; width: number; height: number }
  | { type: 'blob'; data: Blob }
  | { type: 'base64'; data: string }; // Note: data is raw base64, not a data URL

export interface ImageEngine {
  /** A unique identifier for the engine */
  name: string;

  /** Checks if the engine is available and ready to use (e.g., browser support, model loaded) */
  available(): Promise<boolean>;

  /** Generates an image based on the provided request */
  generate(req: GenReq): Promise<GenOut>;
}
