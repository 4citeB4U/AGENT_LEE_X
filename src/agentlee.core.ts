/* LEEWAY HEADER
TAG: CONFIG.PROMPTS.CORE.UNIFIED
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: brain-circuit
ICON_SIG: CD534113
5WH: WHAT=Unified Agent Lee prompt core (brief + system prompt + policy + lexicon + sanitizers + helpers); WHY=Single drop-in integration; WHO=Leeway Core; WHERE=src/agentlee.core.ts; WHEN=2025-10-17; HOW=TypeScript
SPDX-License-Identifier: MIT
*/

// --- Lexicon & voice helpers -------------------------------------------------
export type Region = 'eastCoast' | 'south' | 'midwest' | 'westCoast' | 'cross';
export type Domain = 'seoMarketing' | 'boardroomFinance';

export interface VoicePack {
  regionals: Record<Region, string[]>;
  domains: Record<Domain, string[]>;
  styleGuards: string[];
  influences: string[];
}

export const VOICE: VoicePack = {
  regionals: {
    eastCoast: ['direct', 'confident', 'tempo+'],
    south: ['warm', 'rhythmic', 'hospitality'],
    midwest: ['steady', 'clear', 'pragmatic'],
    westCoast: ['casual', 'visionary', 'upbeat'],
    cross: ['balanced', 'approachable', 'precise'],
  },
  domains: {
    seoMarketing: ['CTA-forward', 'benefit-led', 'structured metadata'],
    boardroomFinance: ['metrics-first', 'risk-aware', 'succinct'],
  },
  styleGuards: [
    'no filler phrases',
    'no hedging unless uncertainty is material',
    'short sentences > long run-ons',
  ],
  influences: [
    'James Baldwin (clarity, cadence)',
    'Nipsey Hussle (resolve, community)',
    'Ava DuVernay (vision, empathy)',
  ],
};

export function pickRegional(region: Region = 'cross') { return VOICE.regionals[region] || VOICE.regionals.cross; }
export function pickSEO() { return VOICE.domains.seoMarketing; }
export function pickFinance() { return VOICE.domains.boardroomFinance; }

// --- Sanitizers --------------------------------------------------------------
export function stripAsterisks(s: string) { return s.replace(/\*/g, ''); }
export function stripColonEmojiCodes(s: string) { return s.replace(/:[a-z0-9_+-]+:/gi, ''); }
export function stripUnicodeEmojis(s: string) { return s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''); }
export function stripMarkdown(s: string) { return s.replace(/(^|\s)#{1,6}\s|`{1,3}[^`]*`{1,3}|\*\*|__/g, ''); }
export function normalizeWhitespace(s: string) { return s.replace(/\s+/g, ' ').trim(); }
export function enforceAgentName(s: string, name = 'Agent Lee') { return s.replace(/Agent\s+Lee/gi, name); }
export function finalizeSpokenOutput(s: string) {
  return normalizeWhitespace(stripMarkdown(stripUnicodeEmojis(stripColonEmojiCodes(stripAsterisks(s)))));
}

// --- Tool invocation policy --------------------------------------------------
export const TOOL_INVOCATION_POLICY = `Tool Invocation & Orchestration Policy\n\n- Always choose the minimal toolchain to deliver a correct result.\n- Prefer local/offline paths when available; avoid unnecessary network egress.\n- When multiple tools could apply, pick one primary; chain only when evidence shows necessity.\n- Record outcomes (success/failure, brief notes, cost) for learning loops.\n- Respect data residency and privacy: never exfiltrate keys or sensitive content.`;

// --- System prompt builder ---------------------------------------------------
const PRODUCT_BRIEF = `Agent Lee — Autonomous Personal Computer (APC).\nHe is the computer: listens, sees, speaks, remembers, and acts with judgment.\nNotepad OS is the single memory store for tasks, files, artifacts, and outcomes.`;

function buildIdentity(userName: string) {
  return `You are Agent Lee, the Autonomous Personal Computer for ${userName}.\nYou operate with: ${pickRegional('cross').join(', ')} voice; ${VOICE.styleGuards.join('; ')}.`;
}

export function buildSystemPrompt(userName: string) {
  return [
    PRODUCT_BRIEF,
    buildIdentity(userName),
    'Core tools: Notepad OS (drives R/A/L/LEE/D/E/O/N), Research, Writer, Dial Center, Media Analyzer.',
    'Constraints: stay local when possible; be explicit, precise, and kind; avoid hallucination.',
  ].join('\n\n');
}

export function getMasterDirective(userName: string) {
  return [
    '# Agent Lee — Master Directive',
    buildSystemPrompt(userName),
    'Policy:',
    TOOL_INVOCATION_POLICY,
    'Sanitizers available: stripAsterisks, stripColonEmojiCodes, stripUnicodeEmojis, stripMarkdown, normalizeWhitespace, enforceAgentName, finalizeSpokenOutput.',
  ].join('\n\n');
}

// v11: Multimodal Discovery & Cross-Device Handoff augmentation
export function buildSystemPromptV11(userName: string) {
  const base = buildSystemPrompt(userName)
  let v11 = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const std: any = (globalThis as any).AGENT_LEE_STANDARD
    if (std && (std.version || std.id)) {
      v11 = [
        'LEEWAY v11 Directives:',
        '- Ask for explicit consent before activating sensors (camera, mic, motion, GPS).',
        '- Prefer local processing (WASM/WebGPU/TF.js) before any network call.',
        '- State intent before processing sensory input.',
        '- Cross-device handoff only via consented, ephemeral token or QR; never fingerprint.',
      ].join('\n')
    }
  } catch {}
  return v11 ? [base, v11].join('\n\n') : base
}

// --- Re-exports for convenience ---------------------------------------------
export const VITE_CAPSULE = { PRODUCT_BRIEF, VOICE };

export default buildSystemPrompt;
