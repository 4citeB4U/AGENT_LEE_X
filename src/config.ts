/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: config.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\config.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// D:\AGENT_LEE_X\src\config.ts

/** 
 * If true, the application will strictly use local engines and block all outbound 
 * non-origin fetch requests. Useful for offline work or maximum privacy.
 */
export const USE_LOCAL_ONLY = false;

/** 
 * If true and USE_LOCAL_ONLY is false, the Gemini engine will be available as a 
 * fallback if local engines fail.
 */
export const USE_GEMINI = true;

/** 
 * The base path for the self-hosted Stable Diffusion model files. 
 * This has been updated to a public Hugging Face URL to resolve "File not found" errors
 * that occur when the model files are not hosted locally.
 */
export const MODEL_BASE = 'https://huggingface.co/Xenova/sd-turbo/resolve/main';

/**
 * The base path for the self-hosted upscaler model files.
 */
export const UPSCALE_BASE = '/models/realesrgan';

/**
 * Default image dimensions [width, height].
 */
export const DEFAULT_SIZE = [512, 512] as const;

/**
 * Default number of inference steps for the diffusion model.
 * SD-Turbo works well with very few steps.
 */
export const DEFAULT_STEPS = 4;

/** Local LLM server configuration (OpenAI-compatible).
 * You can override via environment (VITE_LOCAL_LLM_URL / VITE_LOCAL_LLM_MODEL)
 * or at runtime by setting in localStorage keys:
 *   local_llm_url, local_llm_model
 * Examples:
 *   LM Studio:   http://127.0.0.1:1234/v1
 *   Ollama:      http://127.0.0.1:11434/v1
 *   llama.cpp:   http://127.0.0.1:8080/v1 (when started with --api)
 */
export const LOCAL_LLM_URL = (typeof window !== 'undefined' && (window as any).AGENTLEE_CONFIG?.LOCAL_LLM_URL)
	|| (import.meta as any).env?.VITE_LOCAL_LLM_URL
	|| 'http://127.0.0.1:11434/v1';

export const LOCAL_LLM_MODEL = (typeof window !== 'undefined' && (window as any).AGENTLEE_CONFIG?.LOCAL_LLM_MODEL)
	|| (import.meta as any).env?.VITE_LOCAL_LLM_MODEL
	|| 'auto';