/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: engine.gemini.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\engines\engine.gemini.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// D:\AGENT_LEE_X\src\engines\engine.gemini.ts

import { USE_GEMINI } from '../config';
import { generateImage as generateWithGemini } from '../../services/geminiService';
import type { ImageEngine, GenReq, GenOut } from './engine.types';

class GeminiEngine implements ImageEngine {
    name = 'gemini';

    async available(): Promise<boolean> {
        // The Gemini engine is available if configured and the API key is present.
        return USE_GEMINI && !!process.env.API_KEY;
    }

    async generate(req: GenReq): Promise<GenOut> {
        console.log('Using Gemini Engine for generation...');
        try {
            // The geminiService returns a data URL: "data:image/jpeg;base64,..."
            const dataUrl = await generateWithGemini(req.prompt);
            
            // We need to extract the raw base64 part.
            const base64Data = dataUrl.split(',')[1];
            
            if (!base64Data) {
                throw new Error("Invalid base64 response from Gemini service.");
            }

            return {
                type: 'base64',
                data: base64Data,
            };
        } catch (error) {
            console.error("Gemini Engine failed:", error);
            // Re-throw to allow the router to try the next engine.
            throw error;
        }
    }
}

// Export a single instance of the engine.
// The engine will be non-functional if USE_GEMINI is false.
const geminiEngine = new GeminiEngine();
export default geminiEngine;