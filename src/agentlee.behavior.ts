/* LEEWAY HEADER — DO NOT REMOVE
REGION: brain.behavior.routing.v1
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=route ICON_SIG=RBX-TOOL-ROUTER-001
5WH: WHAT=Agent Lee Scenario→Tool Router & Chain Planner; WHY=Make Lee tool-smart in real life; WHO=RapidWebDevelop; WHERE=A:\AGENT_LEE_X\src\agentlee.behavior.ts; WHEN=2025-10-28; HOW=TypeScript (framework-agnostic)
SPDX-License-Identifier: MIT
*/

///////////////////////////////
// Public API (import these) //
///////////////////////////////

export type StudioId =
  | "creator"            // Creator Image Studio (logo, flyer, renders)
  | "imageEdit"          // Image editing (background remove, enhance)
  | "writers"            // Writers Studio (plans, emails, docs)
  | "research"           // Research Web Studio (search/verify)
  | "documentAnalyzer"   // Document Analyzer (parse/insights)
  | "communication"      // Communication Control (call/text)
  | "diagnostics"        // Diagnostics Studio (models/caches)
  | "planner"            // Task/Calendar Planner
  | "notepad"            // Notepad OS (editing active doc)
  | "drives"             // Drives Explorer (LEE, R, A, …)
  | "showcase";          // Showcase / Animation Studio

export type ChainStep = {
  studio: StudioId;
  intent: string;          // short label of the sub-task
  payload?: any;           // data flowing to the studio
  say?: string;            // what Lee speaks before switching
};

export type AssistPlan = {
  label: string;           // human-friendly description of the plan
  steps: ChainStep[];
  confirmations?: string[];// yes/no confirmations Lee should ask
  saveAs?: {               // persistence behavior
    drive: "LEE";
    kind: "conversation" | "document" | "asset" | "plan";
    tags?: string[];
  };
};

export interface AssistContext {
  route?: string;
  selection?: { hasImage?: boolean; hasText?: boolean; textLen?: number; fileName?: string };
  caps?: { webgpu?: boolean; wasm?: boolean };
  speak?: (text: string) => void;
  persist?: (entry: PersistEntry) => Promise<void>;
  openRoute?: (hash: string) => void;
  emitEvent?: (name: string, detail?: any) => void;
}

export type PersistEntry = {
  drive: "LEE";
  title: string;
  data: {
    USER?: string;
    AGENT?: string;
    chain?: ChainStep[];
    proofLinks?: string[];
    artifacts?: Array<{ kind: "image" | "doc" | "plan" | "note"; url?: string; text?: string }>;
  };
  tags?: string[];
};

export class AgentLeeBehavior {
  constructor(private ctx: AssistContext = {}) {}

  plan(userText: string): AssistPlan {
    const text = (userText || "").trim();
    const lower = text.toLowerCase();

    if (matchAny(lower, TOKENS.logo)) return planLogo(text);
    if (matchAny(lower, TOKENS.flyer)) return planFlyer(text);
    if (matchAny(lower, TOKENS.imageEdit) || (this.ctx.selection?.hasImage && matchAny(lower, TOKENS.edit))) {
      return planImageEdit(text, !!this.ctx.selection?.hasImage);
    }
    if (matchAny(lower, TOKENS.imageGen) || startsWithAny(lower, ["create an image", "make an image", "generate an image"])) {
      return planImageGen(text);
    }

    if (matchAny(lower, TOKENS.businessPlan)) return planBusinessPlan(text);
    if (matchAny(lower, TOKENS.email)) return planEmail(text);
    if (matchAny(lower, TOKENS.deck)) return planDeck(text);
    if (matchAny(lower, TOKENS.summarize)) return planSummarize(text, this.ctx.selection?.hasText);

    if (matchAny(lower, TOKENS.research) || startsWithAny(lower, ["find", "search", "look up"])) return planResearch(text);
    if (matchAny(lower, TOKENS.compare)) return planCompare(text);

    if (matchAny(lower, TOKENS.call)) return planCall(text);
    if (matchAny(lower, TOKENS.textMsg)) return planTextMessage(text);

    if (matchAny(lower, TOKENS.diagnostics)) return planDiagnostics(text);
    if (matchAny(lower, TOKENS.clearCache)) return planClearCache(text);
    if (matchAny(lower, TOKENS.seedDocs)) return planReseedDocs(text);

    if (matchAny(lower, TOKENS.planWeek)) return planWeek(text);

    if (matchAny(lower, TOKENS.analyze) && this.ctx.selection?.hasText) return planAnalyze(text);
    if (matchAny(lower, TOKENS.logoAndPlan)) return planLogoPlusBusiness(text);

    return fallbackWriters(text);
  }

  async execute(plan: AssistPlan, options?: { autoConfirm?: boolean }) {
    const { speak, openRoute, emitEvent, persist } = this.ctx;
    const say = (t?: string) => t && speak?.(t);

    if (!options?.autoConfirm && plan.confirmations?.length) {
      say("Quick check before I start.");
      for (const q of plan.confirmations) say(q);
    }

    for (const step of plan.steps) {
      if (step.say) say(step.say);
      navigateStudio(openRoute, step.studio);
      emitEvent?.("agentlee:activate", step);
      emitEvent?.(`agentlee:${step.studio}:run`, { intent: step.intent, payload: step.payload });
    }

    if (plan.saveAs && persist) {
      const entry: PersistEntry = {
        drive: "LEE",
        title: truncate(`Q: ${plan.label}`, 80),
        data: { USER: plan.label, AGENT: summarizePlanForStorage(plan), chain: plan.steps },
        tags: ["agentlee", "autolog", ...(plan.saveAs.tags ?? [])],
      };
      await persist(entry).catch(() => {});
    }

    return plan;
  }
}

const TOKENS = {
  logo: ["logo", "brand mark", "branding"],
  flyer: ["flyer", "poster", "one-pager"],
  imageGen: ["create an image", "make an image", "generate an image", "image of", "picture of"],
  imageEdit: ["remove background", "edit image", "sharpen", "retouch", "change background"],
  edit: ["edit", "remove", "replace", "enhance"],

  businessPlan: ["business plan", "biz plan", "lean canvas", "executive summary", "swot"],
  email: ["email", "letter", "cover letter", "proposal email"],
  deck: ["slide", "slides", "pitch deck", "presentation"],
  summarize: ["summarize", "summary", "tl;dr"],

  research: ["research", "verify", "fact check", "sources", "citations"],
  compare: ["compare", "vs", "versus", "difference between"],

  call: ["call", "video call", "voice call"],
  textMsg: ["text", "sms", "message"],

  diagnostics: ["diagnostic", "diagnostics", "check models", "webgpu"],
  clearCache: ["clear cache", "hard reload", "reset cache"],
  seedDocs: ["re-seed docs", "seed docs", "seed lee"],

  planWeek: ["plan my week", "weekly plan", "schedule my week"],
  analyze: ["analyze", "extract", "insights"],

  logoAndPlan: ["logo and business plan", "logo & business plan", "create logo and write a business plan"],
};

function planLogo(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "creator", intent: "logo.generate", say: "Opening my Creator Image Studio to design your logo." },
      { studio: "writers", intent: "brand.copy", say: "Switching to Writers for slogan and brand voice guidance." },
      { studio: "research", intent: "brand.verify", say: "Verifying availability and conventions with Research Studio." },
    ],
    confirmations: [
      "Do you have preferred colors or symbols?",
      "Should I include a vector SVG export?",
    ],
    saveAs: { drive: "LEE", kind: "asset", tags: ["logo", "branding"] },
  };
}

function planFlyer(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "creator", intent: "flyer.layout", say: "Opening Creator to lay out your flyer." },
      { studio: "writers", intent: "flyer.copy", say: "Drafting headline, offer, and call-to-action in Writers." },
      { studio: "research", intent: "print.specs", say: "Checking print specs and best practices with Research." },
    ],
    confirmations: [
      "Portrait or landscape?",
      "Do you need print bleed and CMYK export?",
    ],
    saveAs: { drive: "LEE", kind: "asset", tags: ["flyer", "marketing"] },
  };
}

function planImageEdit(label: string, hasSelection: boolean): AssistPlan {
  return {
    label,
    steps: [
      { studio: "imageEdit", intent: "image.edit", payload: { useSelected: hasSelection }, say: "Opening Image Editor for precise adjustments." },
    ],
    confirmations: [
      "Background: transparent or white?",
      "Any retouching or sharpening needed?",
    ],
    saveAs: { drive: "LEE", kind: "asset", tags: ["image-edit"] },
  };
}

function planImageGen(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "creator", intent: "image.generate", say: "Opening Creator to generate your image." },
    ],
    confirmations: [
      "Do you prefer realistic or stylized?",
      "Target size or aspect ratio?",
    ],
    saveAs: { drive: "LEE", kind: "asset", tags: ["image"] },
  };
}

function planBusinessPlan(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "bizplan.outline", say: "Opening Writers Studio to outline your business plan." },
      { studio: "research", intent: "bizplan.proof", say: "Pulling market data and references in Research." },
      { studio: "writers", intent: "bizplan.draft", say: "Drafting the executive summary and financial assumptions." },
    ],
    confirmations: [
      "Include financial projections now or as a separate step?",
      "Do you have a target city or niche for the market section?",
    ],
    saveAs: { drive: "LEE", kind: "document", tags: ["business-plan"] },
  };
}

function planEmail(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "email.compose", say: "Opening Writers to draft your email." },
      { studio: "communication", intent: "message.send", say: "Ready to send from Communication Control when you approve." },
    ],
    confirmations: ["Formal or casual tone?", "Who is the recipient and subject line?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["email"] },
  };
}

function planDeck(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "deck.outline", say: "Outlining a 10-slide deck in Writers." },
      { studio: "creator", intent: "deck.visuals", say: "Creating supporting visuals in Creator." },
    ],
    confirmations: ["Minimal design or bold/colorful?", "Do you want speaker notes added?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["deck", "slides"] },
  };
}

function planSummarize(label: string, hasText?: boolean): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "summary.generate", payload: { fromSelection: !!hasText }, say: "Summarizing in Writers Studio." },
      { studio: "notepad", intent: "summary.save", say: "Saving to Notepad OS for quick review." },
    ],
    saveAs: { drive: "LEE", kind: "document", tags: ["summary"] },
  };
}

function planResearch(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "research", intent: "search.query", say: "Opening Research Studio for sources and citations." },
      { studio: "writers", intent: "research.brief", say: "Drafting a clean research brief in Writers." },
    ],
    confirmations: ["Do you want me to include clickable citations?", "Depth: overview or deep dive?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["research"] },
  };
}

function planCompare(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "research", intent: "compare.fetch", say: "Fetching specs and references in Research." },
      { studio: "diagnostics", intent: "compare.localCaps", say: "Checking your local model capabilities in Diagnostics." },
      { studio: "writers", intent: "compare.report", say: "Compiling a comparison report in Writers." },
    ],
    confirmations: ["Should I include benchmark charts?", "Do you want a quick recommendation at the top?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["comparison"] },
  };
}

function planCall(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "communication", intent: "call.start", say: "Opening Communication Control to place your call." },
    ],
    confirmations: ["Voice or video call?", "Use speaker or headset?"],
    saveAs: { drive: "LEE", kind: "plan", tags: ["call"] },
  };
}

function planTextMessage(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "sms.compose", say: "Drafting your message in Writers." },
      { studio: "communication", intent: "sms.send", say: "Ready to send in Communication Control once approved." },
    ],
    confirmations: ["Include emojis or keep it plain?", "Should I add a signature line?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["sms"] },
  };
}

function planDiagnostics(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "diagnostics", intent: "health.check", say: "Opening Diagnostics to check models, WebGPU, and modules." },
    ],
    saveAs: { drive: "LEE", kind: "plan", tags: ["diagnostics"] },
  };
}

function planClearCache(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "diagnostics", intent: "cache.clear", say: "Clearing caches and unregistering the Service Worker." },
    ],
    confirmations: ["Proceed to clear cache and reload now?"],
    saveAs: { drive: "LEE", kind: "plan", tags: ["cache"] },
  };
}

function planReseedDocs(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "diagnostics", intent: "docs.reseed", say: "Re-seeding LEE docs; I’ll confirm when done." },
      { studio: "drives", intent: "drives.open", say: "Opening Drives to view LEE after seeding." },
    ],
    saveAs: { drive: "LEE", kind: "plan", tags: ["seed"] },
  };
}

function planWeek(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "planner", intent: "week.generate", say: "Opening Planner to build your weekly schedule." },
      { studio: "notepad", intent: "plan.save", say: "Saving the plan to Notepad OS." },
    ],
    confirmations: ["Include personal tasks or only business?", "Morning focus blocks okay?"],
    saveAs: { drive: "LEE", kind: "plan", tags: ["planner"] },
  };
}

function planAnalyze(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "documentAnalyzer", intent: "doc.extract", say: "Analyzing your document for key insights." },
      { studio: "writers", intent: "doc.report", say: "Compiling a short report in Writers." },
    ],
    confirmations: ["Do you want bullet points or narrative output?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["analysis"] },
  };
}

function planLogoPlusBusiness(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "creator", intent: "logo.generate", say: "Creating your logo in Creator." },
      { studio: "writers", intent: "bizplan.outline", say: "Outlining your business plan in Writers." },
      { studio: "research", intent: "bizplan.proof", say: "Verifying market data and references in Research." },
      { studio: "writers", intent: "bizplan.draft", say: "Drafting the plan with a brand section and your new logo." },
    ],
    confirmations: [
      "Want me to embed the logo into the title page of the plan?",
      "Include a pricing table and service tiers?",
    ],
    saveAs: { drive: "LEE", kind: "document", tags: ["logo", "business-plan"] },
  };
}

function fallbackWriters(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "writers", intent: "general.help", say: "I’ll start in Writers to structure this request." },
    ],
    confirmations: ["Should I also check for supporting sources in Research?"],
    saveAs: { drive: "LEE", kind: "document", tags: ["general"] },
  };
}

function matchAny(hay: string, needles: string[]) { return needles.some((n) => hay.includes(n)); }
function startsWithAny(hay: string, needles: string[]) { return needles.some((n) => hay.startsWith(n)); }
function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function navigateStudio(openRoute: AssistContext["openRoute"], studio: StudioId) {
  const route = STUDIO_ROUTE[studio] || "#/";
  if (openRoute) openRoute(route);
  else if (typeof window !== "undefined") window.location.hash = route;
}

const STUDIO_ROUTE: Record<StudioId, string> = {
  creator: "#/creator",
  imageEdit: "#/creator/edit",
  writers: "#/writers",
  research: "#/research",
  documentAnalyzer: "#/analyzer",
  communication: "#/comm",
  diagnostics: "#/diagnostics/models",
  planner: "#/planner",
  notepad: "#/notepad",
  drives: "#/drives",
  showcase: "#/showcase",
};

function summarizePlanForStorage(plan: AssistPlan) {
  const steps = plan.steps.map(s => `• ${s.studio} → ${s.intent}`).join("\n");
  return `Plan: ${plan.label}\nSteps:\n${steps}`;
}
