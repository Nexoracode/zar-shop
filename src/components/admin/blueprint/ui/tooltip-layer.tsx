"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseTooltipText } from "@/lib/tooltip-text";

const SHOW_DELAY_MS = 380;
/** A second tooltip opened this soon after the last one closed skips most of the wait, so sweeping across a row of icons feels continuous. */
const WARM_WINDOW_MS = 800;
const WARM_DELAY_MS = 60;
const FOCUS_DELAY_MS = 140;
/**
 * The first sweep over the page waits this long after mount. React hydrates the server-rendered
 * `title` attributes as they are; rewriting one before its subtree has hydrated would read as a
 * mismatch. Anything hovered before then is still adopted on the spot (see `adoptChain`).
 */
const FIRST_SWEEP_DELAY_MS = 1500;
const GAP = 10;
const EDGE = 8;
const ARROW_INSET = 16;
const TIP = "data-bp-tip";
/** Marks a `data-bp-tip` that was derived from a `title`, so it can follow that `title` when React changes or drops it. */
const AUTO = "data-bp-tip-auto";
const NOT_TITLED = new Set(["IFRAME", "OBJECT", "EMBED", "STYLE", "LINK", "SCRIPT", "META", "HTML", "HEAD", "BODY"]);

type Anchor = { text: string; rect: DOMRect };
type Placement = { top: number; left: number; side: "top" | "bottom"; arrowX: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Moves an element's `title` into `data-bp-tip` and leaves `title=""` behind.
 *
 * The browser's bubble cannot be switched off, and stripping a title only while it is hovered is
 * too late — the browser has usually decided on its bubble by the time a script reacts. So the
 * title is taken away up front. An EMPTY title (rather than none) is deliberate: it shows nothing
 * and, unlike a missing one, stops the browser reaching up to a titled ancestor. It also keeps
 * React's view of the DOM intact, and lets a later change by React show up as an attribute
 * mutation: a new `title` is adopted again, and a removed one takes its derived tip with it.
 */
function adopt(element: Element) {
  if (NOT_TITLED.has(element.tagName.toUpperCase())) return;
  const title = element.getAttribute("title");
  if (title === null) {
    if (element.hasAttribute(AUTO)) { element.removeAttribute(TIP); element.removeAttribute(AUTO); }
    return;
  }
  if (title === "" || !element.closest(".bp-root") || element.closest(".bp-tooltip")) return;
  const text = title.trim();
  element.setAttribute("title", "");
  if (!text) return;
  // An explicit `data-bp-tip` belongs to whoever wrote it; only a tip derived from a title is replaced.
  if (element.hasAttribute(TIP) && !element.hasAttribute(AUTO)) return;
  element.setAttribute(TIP, text);
  element.setAttribute(AUTO, "");
  // A control that relied on its title as its only name (an icon-only button) keeps one.
  if (!element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby") && !element.textContent?.trim()) {
    element.setAttribute("aria-label", text.replace(/\s*\n\s*/g, "، "));
  }
}

function adoptTree(root: ParentNode) {
  if (root instanceof Element) adopt(root);
  root.querySelectorAll("[title]").forEach(adopt);
}

/** Adopts the titles from `start` up to the page root and returns the innermost element with tooltip text. */
function adoptChain(start: EventTarget | null): Element | null {
  const first = start instanceof Element ? start : null;
  if (!first || first.closest(".bp-tooltip") || !first.closest(".bp-root")) return null;
  let found: Element | null = null;
  for (let node: Element | null = first; node && node !== document.body; node = node.parentElement) {
    adopt(node);
    if (!found && node.getAttribute(TIP)?.trim()) found = node;
  }
  return found;
}

/**
 * The admin panel's tooltip, for every `title="…"` and `data-bp-tip="…"` inside `.bp-root`.
 *
 * Titles are adopted up front (see `adopt`) so the browser's own bubble has nothing to show, and a
 * MutationObserver keeps that true for whatever React renders later. Multi-line text is laid out
 * as a heading with label/value rows (see `parseTooltipText`). SVG shapes, which cannot use
 * `title=`, opt in through `data-bp-tip`. Touch input is ignored — there is no hover to wait for
 * — and every tooltip disappears on click, scroll, Escape and when the pointer leaves the window.
 */
export function AdminTooltipLayer() {
  const tooltipId = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let host: Element | null = null;
    let visible = false;
    let describedBy: string | null = null;
    /** The element whose tooltip a click/Escape closed — it stays quiet until the pointer leaves it. */
    let dismissed: Element | null = null;
    let timer: number | undefined;
    let closedAt = 0;
    let observer: MutationObserver | null = null;

    function hide() {
      window.clearTimeout(timer);
      if (host) {
        if (describedBy) host.setAttribute("aria-describedby", describedBy); else host.removeAttribute("aria-describedby");
      }
      if (visible) closedAt = Date.now();
      host = null;
      visible = false;
      describedBy = null;
      setShown(false);
      setAnchor(null);
      setPlacement(null);
    }

    function reveal() {
      const current = host;
      const text = current?.getAttribute(TIP)?.trim();
      if (!current || !current.isConnected || !text) { hide(); return; }
      const rect = current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { hide(); return; }
      describedBy = current.getAttribute("aria-describedby");
      current.setAttribute("aria-describedby", [describedBy, tooltipId].filter(Boolean).join(" "));
      visible = true;
      setAnchor({ text, rect });
    }

    function open(next: Element, delay: number) {
      hide();
      host = next;
      timer = window.setTimeout(reveal, delay);
    }

    function dismiss() {
      if (host) dismissed = host;
      hide();
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const next = adoptChain(event.target);
      if (!next) { dismissed = null; hide(); return; }
      if (next === host) return;
      if (next === dismissed) { hide(); return; }
      dismissed = null;
      open(next, Date.now() - closedAt < WARM_WINDOW_MS ? WARM_DELAY_MS : SHOW_DELAY_MS);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      dismissed = null;
      hide();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const next = adoptChain(target);
      if (next && target?.matches(":focus-visible")) open(next, FOCUS_DELAY_MS);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") return;
      dismissed = null;
      hide();
    };

    // From the first sweep on, whatever React adds or changes is adopted as it happens.
    const sweep = window.setTimeout(() => {
      adoptTree(document.body);
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "attributes") adopt(record.target as Element);
          else record.addedNodes.forEach((node) => { if (node instanceof Element) adoptTree(node); });
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
    }, FIRST_SWEEP_DELAY_MS);

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(sweep);
      observer?.disconnect();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      hide();
    };
  }, [tooltipId]);

  // The bubble is mounted invisible first, so this one measuring pass reads its real size and the
  // position it lands in is already final when it fades in.
  useLayoutEffect(() => {
    if (!anchor) return;
    const tip = tipRef.current;
    if (!tip) return;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const { rect } = anchor;
    const roomAbove = rect.top - EDGE;
    const roomBelow = window.innerHeight - rect.bottom - EDGE;
    const side = roomAbove >= height + GAP || roomAbove >= roomBelow ? "top" : "bottom";
    const top = side === "top" ? rect.top - height - GAP : rect.bottom + GAP;
    const centre = rect.left + rect.width / 2;
    const left = clamp(centre - width / 2, EDGE, window.innerWidth - width - EDGE);
    setPlacement({ top: clamp(top, EDGE, window.innerHeight - height - EDGE), left, side, arrowX: clamp(centre - left, ARROW_INSET, width - ARROW_INSET) });
  }, [anchor]);

  useEffect(() => {
    if (!placement) return;
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, [placement]);

  if (!anchor || typeof document === "undefined") return null;
  const lines = parseTooltipText(anchor.text);

  return createPortal(
    <div
      ref={tipRef}
      id={tooltipId}
      role="tooltip"
      dir="rtl"
      // Declares `.bp-root` itself: the portal sits outside the shell, so the blueprint tokens
      // would not otherwise resolve for it.
      className="bp-root bp-tooltip"
      data-side={placement?.side ?? "top"}
      data-shown={shown && placement ? "true" : "false"}
      style={{ top: placement?.top ?? 0, left: placement?.left ?? 0, visibility: placement ? undefined : "hidden" }}
    >
      <span className="bp-tooltip-arrow" style={{ left: (placement?.arrowX ?? 0) - 4.5 }} aria-hidden />
      {lines.map((line, index) => (line.kind === "pair"
        ? <div key={index} className="bp-tip-row"><span className="bp-tip-key">{line.label}</span><span className="bp-tip-value">{line.value}</span></div>
        : <div key={index} className={line.kind === "title" ? "bp-tip-title" : "bp-tip-text"}>{line.text}</div>))}
    </div>,
    document.body,
  );
}
