import { routeIntent, type Intent } from "./intent";
import { TOOL_REGISTRY, type ToolKey } from "./tools";

const LIVE_REGION_ID = "lee-live";
const DEFAULT_DELAY_MS = 60;

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

function ensureLiveRegion(): HTMLElement {
  let region = document.getElementById(LIVE_REGION_ID) as HTMLElement | null;
  if (!region) {
    region = document.createElement("div");
    region.id = LIVE_REGION_ID;
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.style.position = "absolute";
    region.style.left = "-9999px";
    region.style.top = "auto";
    region.style.width = "1px";
    region.style.height = "1px";
    region.style.overflow = "hidden";
    document.body.appendChild(region);
  }
  return region;
}

function announce(message: string) {
  const region = ensureLiveRegion();
  region.textContent = message;
}

function halo(element: HTMLElement) {
  const haloEl = document.createElement("span");
  haloEl.className = "ghost-click";
  const rect = element.getBoundingClientRect();
  haloEl.style.left = `${rect.left + rect.width / 2}px`;
  haloEl.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(haloEl);
  window.setTimeout(() => haloEl.remove(), 600);
}

function focusAndReveal(element: HTMLElement) {
  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }
  try {
    element.focus({ preventScroll: true });
  } catch {
    if (typeof element.focus === "function") {
      element.focus();
    }
  }
}

async function activateTool(tool: ToolKey, navigate?: (to: string) => void) {
  const definition = TOOL_REGISTRY[tool];
  if (!definition) return null;

  if (navigate) {
    navigate(definition.route);
  }

  await wait(DEFAULT_DELAY_MS);
  const element = document.querySelector(definition.selector) as HTMLElement | null;
  if (!element) return null;

  element.click();
  focusAndReveal(element);
  halo(element);
  announce(`Agent Lee opened ${definition.label}.`);
  return { definition, element };
}

export interface ActivateOptions {
  navigate?: (to: string) => void;
}

export async function activateToolByIntent(intent: Intent, options?: ActivateOptions) {
  const target = routeIntent(intent);
  const primary = await activateTool(target.tool, options?.navigate);
  if (!primary) return;

  if (!target.subtool) return;

  const subtoolDef = primary.definition.subtools?.[target.subtool];
  if (!subtoolDef?.selector) return;

  await wait(DEFAULT_DELAY_MS);
  const subElement = document.querySelector(subtoolDef.selector) as HTMLElement | null;
  if (!subElement) return;

  subElement.click();
  focusAndReveal(subElement);
  halo(subElement);
  announce(`Agent Lee opened ${primary.definition.label} – ${subtoolDef.label}.`);
}

export function toast(message: string, duration = 2000) {
  const toastEl = document.createElement("div");
  toastEl.className = "lee-toast";
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add("on"));
  window.setTimeout(() => {
    toastEl.classList.remove("on");
    window.setTimeout(() => toastEl.remove(), 200);
  }, duration);
}
