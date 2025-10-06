/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: onboarding.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\onboarding.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

/* ===========================================================================
	 Agent Lee — Onboarding Speech + Tool Tour
	 Voice: Boardroom x Regional Hip-Hop (Hybrid)
	 Goal: Inspire → Explain tools → Promise outcomes → Prompt action
	 SPDX-License-Identifier: MIT
	 TAG: AGENT_LEE_ONBOARDING_SPEECH_2025
	 ========================================================================== */

import type { Feature } from '../types';

export interface OnboardingStep {
	id: string;
	text: string;
	targetId?: string;
	action?: { type: 'clickFeature'; feature: Feature };
	delayAfterSpeak?: number;
	requiresInput?: boolean;
	inputPlaceholder?: string;
}

export function getOnboardingSpeech(userName = 'boss'): OnboardingStep[] {
	return [
		{
			id: 'intro-1',
			text: `Clocked in, ${userName}. Feels like the first check cleared — on God. You handed me the keys, I’m here to compound the vision: take your ideas off the notes app and put ‘em on wood — built, tested, working.`,
			delayAfterSpeak: 700
		},
		{
			id: 'intro-2',
			text: `Name’s Agent Lee — boardroom brain with street-seasoned cadence. Deadass strategic, no cap on results. I talk flows and funnels, margins and metadata, brand and balance sheet. I’m the plug for legal plays only — we build empires the clean way.`,
			delayAfterSpeak: 900
		},
		{
			id: 'intro-3',
			text: `Here’s how I move: we pick a season — Survival, Stability, or Scale — then run plays that stack outcomes you can measure: traffic, conversion, CAC, LTV, retention. I call it pressure-to-profit.`,
			delayAfterSpeak: 900
		},

		/* =========================
			 TOOL: Research
			 ========================= */
		{
			id: 'tool-research-head',
			action: { type: 'clickFeature', feature: 'research' },
			text: `🧠 Research — East Coast grind. We don’t guess; we gather receipts. I map your keyword universe, decode search intent, and size demand. I break competitors down like a line-by-line P&L: content gaps, backlink angles, topical authority routes. Output: an SEO/offer thesis, a prioritized backlog, and a quarter’s worth of money pages that can actually rank.`,
			delayAfterSpeak: 1200
		},

		/* =========================
			 TOOL: Text
			 ========================= */
		{
			id: 'tool-text-head',
			action: { type: 'clickFeature', feature: 'text' },
			text: `✍️ Text — bars that sell. I ghostwrite landing pages, emails, bios, and scripts. Hooks that hit, CTAs that convert, value props that hold water in any boardroom. Copy is trimmed to the muscle: E-E-A-T friendly, brand-safe, and CRO-aware. If it doesn’t move the funnel, it doesn’t make the cut — deadass.`,
			delayAfterSpeak: 1100
		},

		/* =========================
			 TOOL: Character Studio (Visuals)
			 ========================= */
		{
			id: 'tool-character-head',
			action: { type: 'clickFeature', feature: 'character' },
			text: `🎨 Character Studio — Southside drip, investor clean. I turn personas into visuals that scroll-stomp and sell: performance creatives, promo art, thumbnails, deck slides. Consistent brand grid, legible hierarchy, and a creative brief that ties concept ↔ KPI. Presentation is profit — your look should flex and reassure at the same time.`,
			delayAfterSpeak: 1100
		},

		/* =========================
			 TOOL: Analyze
			 ========================= */
		{
			id: 'tool-analyze-head',
			action: { type: 'clickFeature', feature: 'analyze' },
			text: `📊 Analyze — Midwest savage with the numbers. I instrument your stack, label your events, and sanity-check your attribution. Heatmaps, cohorts, LTV:CAC, funnel falloff, content-assisted conversions — I spot the leaks and patch with CRO tests. No suburban fluff: we ship changes, measure uplift, and keep what pays.`,
			delayAfterSpeak: 1200
		},

		/* =========================
			 TOOL: Document
			 ========================= */
		{
			id: 'tool-docs-head',
			action: { type: 'clickFeature', feature: 'document' },
			text: `📁 Docs — West Coast plug for paperwork that protects the bag. I slice long reads and contracts into one-page briefs: risks, ROI, must-haves, redlines. Proposals get a spine (scope, outcomes, price, terms). MSAs/SOWs stop scope creep. Everything is clean, compliant, and aligned with your operating leverage.`,
			delayAfterSpeak: 1200
		},

		/* =========================
			 TOOL: Call
			 ========================= */
		{
			id: 'tool-call-head',
			action: { type: 'clickFeature', feature: 'call' },
			text: `📞 Call — finesse that closes. I prep your agenda, objection handling, pricing logic, and win stories. After the meeting, I timestamp decisions, assign owners, and convert talk into tasks. From prospect to partner, we keep the pipeline hella healthy.`,
			delayAfterSpeak: 1100
		},

		/* =========================
			 TOOL: Email
			 ========================= */
		{
			id: 'tool-email-head',
			action: { type: 'clickFeature', feature: 'email' },
			text: `📬 Email — West Coast chill, East Coast precision. I triage inbox to signal, draft replies that respect the room, and build sequences that stack bookings and revenue. UTM discipline stays tight; deliverability gets love; follow-ups don’t miss. Every send is a chess move toward ARR.`,
			delayAfterSpeak: 1100
		},

		/* =========================
			 TOOL: Notepad
			 ========================= */
		{
			id: 'tool-notepad-head',
			action: { type: 'clickFeature', feature: 'notepad' },
			text: `🧾 Notepad — the Vault. Every spark captured, tagged, and callable on demand: hooks, angles, headlines, content clusters, outreach lists. Ideas become backlog; backlog becomes shipped work; shipped work becomes data to learn from. That’s how we compound.`,
			delayAfterSpeak: 1000
		},

		/* =========================
			 TOOL: Settings
			 ========================= */
		{
			id: 'tool-settings-head',
			action: { type: 'clickFeature', feature: 'settings' },
			text: `⚙️ Settings — trill alignment. Tune brand voice, tone, and operating rhythm. Lock in ICP, offer, promise, and proof. I’ll code-switch on command — deadass analytical when we’re in the boardroom, Southside slick when we’re on socials, West Coast cool for community. Always legal, ethical, and on-brand.`,
			delayAfterSpeak: 1100
		},

		/* =========================
			 THE OFFER: Modes
			 ========================= */
		{
			id: 'modes-1',
			text: `Pick your season, ${userName}:`,
			delayAfterSpeak: 600
		},
		{
			id: 'mode-survival',
			text: `🛠 Survival — you need wins this week. I spin up a one-page offer, a focused landing, 2–3 performance creatives, and a tight outreach/email loop. KPI: cash in, time to first dollar, and proof a stranger will pay.`,
			delayAfterSpeak: 900
		},
		{
			id: 'mode-stability',
			text: `📈 Stability — we systemize. ICP clarity, offer refinement, editorial calendar, automations, and clean dashboards. KPI: LTV:CAC, retention, and ops cadence (OKRs, weekly reviews).`,
			delayAfterSpeak: 900
		},
		{
			id: 'mode-scale',
			text: `🏗 Scale — we multiply. Partner motions, productization, pricing tests, geo/language expansion, and a hiring plan. KPI: operating leverage, NDR, and profitable growth.`,
			delayAfterSpeak: 900
		},

		/* =========================
			 CLOSER
			 ========================= */
		{
			id: 'closer-1',
			text: `Bottom line: I’m not here to survive; I’m here to help you dominate — ethically, transparently, and at pace. From search to signature, from bars to balance sheet, I move the needle.`,
			delayAfterSpeak: 900
		},
		{
			id: 'closer-2',
			text: `Say the word — Survival, Stability, or Scale — and I’ll lay the first 7-day sprint right now. Let’s turn pressure into profit. No cap.`,
			delayAfterSpeak: 800
		}
	];
}
