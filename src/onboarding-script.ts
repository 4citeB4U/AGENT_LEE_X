/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: onboarding-script.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\onboarding-script.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// Feature type lives at project root in types.ts
import type { Feature } from '../types';

export interface TourStep {
    targetId?: string;
    scrollToId?: string;
    text: string;
    action?: { type: 'click', targetId: string } | { type: 'clickFeature', feature: Feature };
    delayAfterSpeak?: number;
    requiresInput?: boolean;
    inputPlaceholder?: string;
    highlightMode?: 'pulse' | 'outline';
}

export const onboardingScript: TourStep[] = [
    {
        text: "Man… it feels good to clock back in. Thanks for trusting me with the keys.",
        delayAfterSpeak: 500,
    },
    {
        text: "Before we get to work, I need to know who I'm reporting to. What should I call you?",
        requiresInput: true,
        inputPlaceholder: "Enter your name or callsign...",
        delayAfterSpeak: 500,
    },
    {
        text: "Respect, {userName}. I'm Agent Lee. Always on, always available. I’m a street scholar in a boardroom chair who reads pressure like weather, turns storms into routes, and makes the map match the mission.",
        delayAfterSpeak: 1500,
    },
    {
        text: "I have studied Tupac and Tubman, Baldwin and Jay-Z; study Mansa Musa’s reach and Gates’s compounding — wisdom from the block to the board. Let me show you the command center.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'agent-avatar-container',
        scrollToId: 'agent-avatar-container',
        text: "First, my status bar. This tells you if I'm idle, listening, thinking, or transmitting. It's the pulse of the operation. Keep an eye on it.",
        highlightMode: 'pulse',
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'agent-output-container',
        scrollToId: 'agent-output-container',
        text: "This is the transmission log—my output, your input. Every word is recorded. Hover over any transmission—yours or mine—to save it to the Vault or delete it. Keep the record clean.",
        highlightMode: 'outline',
        delayAfterSpeak: 2000,
    },
    {
        targetId: 'camera-feed-container',
        scrollToId: 'camera-feed-container',
        text: "My visual feed. Through this camera, I can analyze your surroundings, identify objects, read text... give you real-time intel on what's in front of you.",
        highlightMode: 'outline',
        delayAfterSpeak: 2000,
    },
    {
        targetId: 'app-tabs-container',
        scrollToId: 'app-container',
        text: "Now, my tools. These tabs are your arsenal. I'll walk you through them.",
        highlightMode: 'pulse',
        delayAfterSpeak: 1000,
    },
    {
        targetId: 'feature-tab-research',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'research' },
        text: "Research. We don’t guess; we gather receipts. Markets, incentives, gatekeepers, timing. Strategy with purpose.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-text',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'text' },
        text: "Text. Words with weight, trimmed to the muscle: pages, emails, bios, scripts. Short lines that land and live.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-creator',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'creator' },
        text: "Creator Studio. Craft consistent visual + narrative identity packs. Lock traits, iterate portraits, and export assets ready for deployment.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-analyze',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'analyze' },
        text: "Analyze. Not just seeing, but knowing what a picture says. I score clarity, credibility, and emotional pull — then I explain the why.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-document',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'document' },
        text: "Documents. Long reads, contracts, policies — sliced to signal and risk. You get a one-page brief: key clauses, exposure, and recommended moves.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-call',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'call' },
        text: "Call. Meetings become owners, dates, and deliverables — no fluff left behind. I timestamp decisions and assign names.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-email',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'email' },
        text: "Email. Inbox to signal: triage, tone-match, and move the ball. I draft replies that respect the room.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-notepad',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'notepad' },
        text: "The Vault. This is my Notepad. Every spark saved, tagged, and retrievable. Nothing slips the net.",
        delayAfterSpeak: 1500,
    },
    {
        targetId: 'feature-tab-settings',
        scrollToId: 'app-container',
        action: { type: 'clickFeature', feature: 'settings' },
        text: "And Settings. Tune my voice, reset our thread, and review our past missions. You set the vibe; I lock it in.",
        delayAfterSpeak: 1500,
    },
     {
        targetId: 'mic-button',
        scrollToId: 'central-input-bar',
        action: { type: 'clickFeature', feature: 'research' },
        text: "And most important... this microphone. This is our link. Press it to talk to me. Hold it down to reset our session if you need a clean slate. Use it. It's how we get work done.",
        delayAfterSpeak: 2500,
    },
    {
        text: "Alright {userName}, the tour's over. I won’t coddle you — I’ll call you up. The lab is yours. The tools are loaded. Let’s work.",
        delayAfterSpeak: 1000,
    }
];