import { STUDIOS, type StudioKey } from "../config/studios";

export type ToolKey = StudioKey;

export interface ToolDef {
  key: ToolKey;
  label: string;
  route: string;
  selector: string;
  subtools?: Record<string, { label: string; selector?: string }>;
}

const pickLabel = (key: ToolKey) => STUDIOS[key]?.label ?? key;
const pickRoute = (key: ToolKey) => STUDIOS[key]?.route ?? "/";

export const TOOL_REGISTRY: Record<ToolKey, ToolDef> = {
  writers: {
    key: "writers",
    label: pickLabel("writers"),
    route: pickRoute("writers"),
    selector: '[data-tool="writers"]'
  },
  dissect: {
    key: "dissect",
    label: pickLabel("dissect"),
    route: pickRoute("dissect"),
    selector: '[data-tool="dissect"]'
  },
  creator: {
    key: "creator",
    label: pickLabel("creator"),
    route: pickRoute("creator"),
    selector: '[data-tool="creator"]',
    subtools: {
      image: { label: "Image Generator", selector: '[data-subtool="creator:image"]' },
      video: { label: "Video Generator", selector: '[data-subtool="creator:video"]' }
    }
  },
  dll: {
    key: "dll",
    label: pickLabel("dll"),
    route: pickRoute("dll"),
    selector: '[data-tool="dll"]'
  },
  outreach: {
    key: "outreach",
    label: pickLabel("outreach"),
    route: pickRoute("outreach"),
    selector: '[data-tool="outreach"]'
  },
  campaign: {
    key: "campaign",
    label: pickLabel("campaign"),
    route: pickRoute("campaign"),
    selector: '[data-tool="campaign"]'
  },
  dbl: {
    key: "dbl",
    label: pickLabel("dbl"),
    route: pickRoute("dbl"),
    selector: '[data-tool="dbl"]'
  },
  ta: {
    key: "ta",
    label: pickLabel("ta"),
    route: pickRoute("ta"),
    selector: '[data-tool="ta"]'
  }
};
