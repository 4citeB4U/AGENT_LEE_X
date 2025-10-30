export type StudioKey =
  | "writers"
  | "dissect"
  | "creator"
  | "dll"
  | "outreach"
  | "campaign"
  | "dbl"
  | "ta"
  | "osc"; // OS Control

export interface StudioDef {
  key: StudioKey;
  label: string;
  short: string;
  tagline: string;
  description: string;
  icon: string;
  route: string;
}

import images from "../assets/images";

export const STUDIOS: Record<StudioKey, StudioDef> = {
  writers: {
    key: "writers",
    label: "Writer’s Studio",
    short: "WS",
    tagline: "Draft, rewrite, and polish content.",
    description:
      "Writer’s Studio is your place for drafting, rewriting, and polishing. It supports tone controls, SEO prompts, and brand voice presets.",
    icon: images.tabs.text,
    route: "/studio/writers"
  },
  dissect: {
    key: "dissect",
    label: "Dissecting Media",
    short: "DM",
    tagline: "Analyze audio, video, and images ethically.",
    description:
      "Dissecting Media extracts themes, sentiment, and structure from audio/video/images—always with consent. Use it to summarize meetings, videos, and visuals.",
    icon: images.tabs.analyze,
    route: "/studio/dissect"
  },
  creator: {
    key: "creator",
    label: "Creator Studio (Images/AV)",
    short: "CR",
    tagline: "Generate and refine imagery or motion assets with consent.",
    description:
      "Creator Studio handles image and motion generation workflows. It bridges prompts, presets, and live assets while honoring consent gates and brand rules.",
    icon: images.tabs.creator,
    route: "/studio/creator"
  },
  dll: {
    key: "dll",
    label: "Document Logs Studio (DLL Studio)",
    short: "DLL",
    tagline: "Read, organize, and reason over documents.",
    description:
      "DLL Studio ingests PDFs, CSVs, and notes into a living knowledge log. It supports search, summaries, and RAG—without changing your originals.",
    icon: images.tabs.document,
    route: "/studio/dll"
  },
  outreach: {
    key: "outreach",
    label: "Outreach Studio",
    short: "OS",
    tagline: "Phone, SMS, and voice outreach with consent.",
    description:
      "Outreach Studio handles permissioned calls and SMS. It prepares scripts, records (where legal and consented), and summarizes outcomes.",
    icon: images.tabs.call,
    route: "/studio/outreach"
  },
  campaign: {
    key: "campaign",
    label: "Campaign Studio",
    short: "CS",
    tagline: "Email and campaign orchestration.",
    description:
      "Campaign Studio drafts, schedules, and monitors email campaigns. It aligns with your UTM rules, KPIs, and deliverability best practices.",
    icon: images.tabs.email,
    route: "/studio/campaign"
  },
  dbl: {
    key: "dbl",
    label: "Digital Book of Life (DBL)",
    short: "DBL",
    tagline: "Your personal memory and projects hub.",
    description:
      "DBL is your private memory vault—plans, goals, and life data. You control what’s saved and what’s forgotten, anytime.",
    icon: images.tabs.notepad,
    route: "/studio/dbl"
  },
  ta: {
    key: "ta",
    label: "Toning & Adjustments (TA)",
    short: "TA",
    tagline: "Voice, tone, ethics, and guardrails.",
    description:
      "Toning & Adjustments lets you set brand tone, safety thresholds, consent defaults, and LEEWAY policy modes (FAST/CHEAP/LONG).",
    icon: images.tabs.settings,
    route: "/studio/ta"
  }
  ,
  osc: {
    key: "osc",
    label: "OS Control",
    short: "OSC",
    tagline: "Discover and launch apps on Android & Windows.",
    description:
      "OS Control lists installed apps and lets you launch them locally through the MCP bridge.",
    // Use a distinct icon to avoid visual duplication
    icon: images.tabs.analyze,
    route: "/studio/oscontrol"
  }
};

export const DEFAULT_STUDIO_ORDER: StudioKey[] = [
  "writers",
  "dissect",
  "creator",
  "dll",
  "outreach",
  "campaign",
  "dbl",
  "ta"
];
