import type { ToolKey } from "./tools";

export type IntentKey =
  | "CREATE_IMAGE"
  | "EDIT_IMAGE"
  | "ANALYZE_MEDIA"
  | "WRITE_CONTENT"
  | "ANALYZE_DOC"
  | "MAKE_CALL"
  | "SEND_EMAIL"
  | "OPEN_DBL"
  | "OPEN_TA";

export interface Intent {
  kind: IntentKey;
  payload?: Record<string, unknown>;
}

export interface ToolTarget {
  tool: ToolKey;
  subtool?: string;
}

export function routeIntent(intent: Intent): ToolTarget {
  switch (intent.kind) {
    case "CREATE_IMAGE":
    case "EDIT_IMAGE":
      return { tool: "creator", subtool: "image" };
    case "ANALYZE_MEDIA":
      return { tool: "dissect" };
    case "WRITE_CONTENT":
      return { tool: "writers" };
    case "ANALYZE_DOC":
      return { tool: "dll" };
    case "MAKE_CALL":
      return { tool: "outreach" };
    case "SEND_EMAIL":
      return { tool: "campaign" };
    case "OPEN_DBL":
      return { tool: "dbl" };
    case "OPEN_TA":
      return { tool: "ta" };
    default:
      return { tool: "writers" };
  }
}
