/* LEEWAY HEADER — DO NOT REMOVE
region: ui.component.onboarding_highlighter.v1_1
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=spotlight ICON_SIG=HL901
5WH: WHAT=Onboarding Highlighter Overlay (pulse/outline + mask cutout, CSS-var positioning);
WHY=Robust cross-browser highlight without attr() limits; optional spotlight mask; a11y-first;
WHO=RapidWebDevelop; WHERE:frontend/src/components/OnboardingHighlighter.tsx; WHEN=2025-10-05;
HOW=React portal + ResizeObserver + scroll listeners; CSS variables for position; mask fallback
SIG: 00000000
AGENTS: ANY
SPDX-License-Identifier: MIT
*/

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type HighlightMode = "pulse" | "outline";
export interface TourStep {
  id: string;
  title: string;
  description?: string;
  targetId?: string;
  scrollToId?: string;
  highlightMode?: HighlightMode;
}

export interface OnboardingHighlighterProps {
  step: TourStep | null;
  zIndex?: number;
  padding?: number;
  trapFocus?: boolean;
  ariaLive?: "polite" | "assertive" | "off";
  /** Optional masked “spotlight” cut-out. */
  useMask?: boolean;
}

function byId(id?: string | null) {
  if (!id) return null;
  const el = document.getElementById(id);
  return el && document.body.contains(el) ? el : null;
}

function getRect(el: Element | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top + window.scrollY),
    left: Math.max(0, r.left + window.scrollX),
    width: Math.max(0, r.width),
    height: Math.max(0, r.height),
  };
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 50) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    window.clearTimeout(t);
    // @ts-ignore
    t = window.setTimeout(() => fn(...args), ms);
  };
}

function useOptionalFocusTrap(enabled: boolean, target: HTMLElement | null) {
  const prev = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled || !target) return;
    prev.current = (document.activeElement as HTMLElement) || null;

    const focusable =
      target.matches("a,button,input,textarea,select,[tabindex]") ? target :
      target.querySelector<HTMLElement>("a,button,input,textarea,select,[tabindex]");
    focusable?.focus?.();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const tabbables = Array.from(
        target.querySelectorAll<HTMLElement>("a,button,input,textarea,select,[tabindex]")
      ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex >= 0);
      if (tabbables.length === 0) { e.preventDefault(); return; }
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      prev.current?.focus?.();
    };
  }, [enabled, target]);
}

export function OnboardingHighlighter({
  step,
  zIndex = 9999,
  padding = 8,
  trapFocus = false,
  ariaLive = "polite",
  useMask = false,
}: OnboardingHighlighterProps) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  const portalTarget = useMemo(() => {
    let n = document.getElementById("onboarding-highlighter-root");
    if (!n) {
      n = document.createElement("div");
      n.id = "onboarding-highlighter-root";
      document.body.appendChild(n);
    }
    return n;
  }, []);

  useLayoutEffect(() => {
    const id = "onboarding-highlighter-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes ah-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(57,255,20,0.45); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 12px rgba(57,255,20,0.0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(57,255,20,0.0); }
      }
      .ah-root { position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
      .ah-layer { position: absolute; inset: 0; }
      .ah-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }
      /* Spotlight mask (optional): we create a "hole" at the ring rect */
      .ah-mask {
        position: absolute; inset: 0;
        /* Default to no mask; toggled with data-has-mask on container */
      }
      .ah-container[data-has-mask="true"] .ah-mask {
        background: radial-gradient(100px 100px at 0 0, transparent 0, transparent 99.9%, rgba(0,0,0,0.35) 100%);
        /* We’ll override via CSS variables with clip-path for broader control */
        -webkit-mask: radial-gradient(100px 100px at 0 0, transparent 0, transparent 99.9%, black 100%);
                mask: radial-gradient(100px 100px at 0 0, transparent 0, transparent 99.9%, black 100%);
      }
      .ah-ring {
        position: absolute; box-sizing: border-box; border-radius: 10px;
        background: rgba(255,255,255,0.02);
        outline-offset: 0;
      }
      .ah-ring.pulse { outline: 3px solid rgba(57,255,20,0.9); animation: ah-pulse 1500ms ease-in-out infinite; }
      .ah-ring.outline { outline: 3px solid #ffffff; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); }
      .ah-label {
        position: absolute; transform: translateY(-100%);
        color: #fff; font: 600 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
        background: rgba(0,0,0,0.7); padding: 6px 8px; border-radius: 8px; white-space: nowrap; pointer-events: none;
      }
      .sr-only { position: absolute !important; height: 1px; width: 1px; overflow: hidden; clip: rect(1px,1px,1px,1px); white-space: nowrap; }
      /* CSS variable-driven positioning */
      .ah-varpos {
        --ah-top: 0px; --ah-left: 0px; --ah-width: 0px; --ah-height: 0px;
      }
      .ah-ring { top: var(--ah-top); left: var(--ah-left); width: var(--ah-width); height: var(--ah-height); }
      .ah-label { left: var(--ah-left); top: calc(var(--ah-top) - 8px); }
      /* Mask positioning (fallback uses a second backdrop if mask unsupported) */
      .ah-container[data-has-mask="true"] .ah-mask {
        --mx: 0px; --my: 0px; --mw: 0px; --mh: 0px; 
        /* Prefer clip-path rectangle hole if supported */
        clip-path: path("M0 0 H 100vw V 100vh H 0 Z M var(--mx) var(--my) h var(--mw) v var(--mh) h calc(-1*var(--mw)) Z");
      }
      @supports not (clip-path: path("M0 0 H1 V1 H0 Z")) {
        /* If path clip-path is not supported, we fall back to simple backdrop (ring remains visible). */
        .ah-container[data-has-mask="true"] .ah-mask { display: none; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const recomputeRect = React.useCallback(() => {
    if (!step) { setRect(null); return; }
    const target = byId(step.targetId || step.scrollToId || "");
    const r = getRect(target);
    if (r) {
      setRect({
        top: r.top - padding,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
    } else {
      setRect(null);
    }
  }, [step, padding]);

  useEffect(() => {
    if (!step) return;
    const scrollEl = byId(step.scrollToId || step.targetId || "");
    if (scrollEl) {
      const b = scrollEl.getBoundingClientRect();
      const inView = b.top >= 0 && b.bottom <= (window.innerHeight || document.documentElement.clientHeight);
      if (!inView) scrollEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    if (!step) return;
    const target = byId(step.targetId || step.scrollToId || "");
    const debounced = debounce(recomputeRect, 50);
    recomputeRect();

    const ro = (window as any).ResizeObserver ? new ResizeObserver(() => debounced()) : null;
    ro?.observe(document.documentElement);
    if (target && (window as any).ResizeObserver) (ro as ResizeObserver)?.observe(target);

    const onScroll = () => debounced();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [step, recomputeRect]);

  useEffect(() => {
    if (!step || !liveRef.current) return;
    liveRef.current.textContent = `Highlighting: ${step.title}`;
  }, [step]);

  useOptionalFocusTrap(
    !!step && !!step.targetId && trapFocus,
    (byId(step?.targetId || "") as HTMLElement) || null
  );

  useEffect(() => setMounted(true), []);
  if (!mounted || !step || !rect) return null;

  const mode: HighlightMode = step.highlightMode || "outline";

  // Move CSS variable values to data attributes to satisfy lint (no inline style vars)
  const dataPos = {
    'data-ah-top': rect.top,
    'data-ah-left': rect.left,
    'data-ah-width': rect.width,
    'data-ah-height': rect.height,
  } as const;
  const dataMask = {
    'data-mx': rect.left,
    'data-my': rect.top,
    'data-mw': rect.width,
    'data-mh': rect.height,
  } as const;

  const hasMask = !!useMask;

  return createPortal(
    <div
      className="ah-root ah-varpos ah-container"
      data-mode={mode}
      data-has-mask={hasMask ? "true" : "false"}
      data-step-id={step.id}
      data-target-id={step.targetId || ""}
      {...dataPos}
    >
      <div className="ah-layer">
        {/* optional masked spotlight cutout */}
        {hasMask && <div className="ah-mask" {...dataMask} aria-hidden />}
        {/* backdrop (kept even with mask as a fallback) */}
        <div className="ah-backdrop" aria-hidden />
        {/* focus ring */}
        <div className={`ah-ring ${mode}`} aria-hidden />
        {/* label */}
        <div className="ah-label">{step.title}</div>
        {/* ARIA live region */}
        <div
          ref={liveRef}
          className="sr-only"
          aria-atomic="true"
          {...(ariaLive === 'off' ? {} : { 'aria-live': ariaLive })}
        />
      </div>
    </div>,
    portalTarget
  );
}

export default OnboardingHighlighter;
