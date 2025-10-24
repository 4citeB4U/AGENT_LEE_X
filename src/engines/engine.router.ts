/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: engine.router.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\engines\engine.router.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// D:\AGENT_LEE_X\src\engines\engine.router.ts

import geminiEngine from './engine.gemini';
import lightningEngine from './engine.lightning';
import type { GenOut, GenReq } from './engine.types';

/**
 * Generates an image using the configured primary engine (Gemini).
 * This function previously routed between a local and remote engine, but the local
 * engine was removed due to library incompatibilities causing runtime errors.
 * @param req The image generation request.
 * @returns A promise that resolves with the generated image output.
 * @throws An error if the generation engine fails.
 */
export async function generateImage(req: GenReq): Promise<GenOut> {
  try {
    if (await lightningEngine.available()) {
      console.log(`Attempting generation with engine: ${lightningEngine.name}`);
      return await lightningEngine.generate(req);
    } else if (await geminiEngine.available()) {
      console.log(`Attempting generation with engine: ${geminiEngine.name}`);
      return await geminiEngine.generate(req);
    } else {
      throw new Error('The Gemini image generation engine is not available. Please check your configuration.');
    }
  } catch (err) {
    console.error(`Image generation failed.`, err);
    // Re-throw the error to be handled by the UI.
    throw err;
  }
}
