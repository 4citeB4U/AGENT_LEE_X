import { useEffect } from "react";
import type { Feature } from "../../types";
import type { StudioKey } from "../config/studios";

const HOTKEY_MAP: Record<string, StudioKey> = {
  w: "writers",
  d: "dissect",
  i: "creator",
  l: "dll",
  o: "outreach",
  c: "campaign",
  b: "dbl",
  t: "ta"
};

const FEATURE_BY_STUDIO: Record<StudioKey, Feature> = {
  writers: "text",
  dissect: "analyze",
  creator: "creator",
  dll: "document",
  outreach: "call",
  campaign: "email",
  dbl: "notepad",
  ta: "settings"
};

type HotkeyHandler = (feature: Feature) => void | Promise<void>;

export function useStudioHotkeys(onStudioSelected: HotkeyHandler) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();
      const studio = HOTKEY_MAP[key];
      if (!studio) return;
      event.preventDefault();
      try {
        const result = onStudioSelected(FEATURE_BY_STUDIO[studio]);
        if (result && typeof (result as PromiseLike<void>).then === "function") {
          (result as PromiseLike<void>).then(undefined, (err: unknown) => {
            console.error("Studio hotkey handler failed", err);
          });
        }
      } catch (error) {
        console.error("Studio hotkey handler threw", error);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStudioSelected]);
}
