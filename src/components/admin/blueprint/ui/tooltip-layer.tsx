"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseTooltipText } from "@/lib/tooltip-text";

const SHOW_DELAY_MS = 380;
/** A second tooltip opened this soon after the last one closed skips most of the wait, so sweeping across a row of icons feels continuous. */
const WARM_WINDOW_MS = 800;
const WARM_DELAY_MS = 60;
const FOCUS_DELAY_MS = 140;
const GAP = 10;
const EDGE = 8;
const ARROW_INSET = 16;
const TIP_ATTRIBUTE = "data-bp-tip";

type Anchor = { text: string; rect: DOMRect };
type Placement = { top: number; left: number; side: "top" | "bottom"; arrowX: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * The admin panel's tooltip, for every `title="…"` and `data-bp-tip="…"` inside `.bp-root`.
 *
 * A browser offers no switch for its own bubble, so it is kept from ever appearing by leaving it
 * nothing to show: while the pointer is over an element, the `title` of that element AND of every
 * ancestor up to the admin root is set aside (a browser falls back to a titled ancestor when the
 * hovered element has none). The titles come back only once the pointer has moved off them — not
 * when our own tooltip closes on a click or scroll, which is when a native bubble used to slip
 * through under a still-resting pointer. A MutationObserver re-checks whatever sits under the
 * pointer whenever the DOM changes, so an element re-rendered beneath a motionless mouse (a row
 * refreshed after a toggle, a `title` React sets again) is silenced too.
 *
 * Multi-line text is laid out as a heading with label/value rows (see `parseTooltipText`). SVG
 * shapes, which cannot use `title=`, opt in through `data-bp-tip`. Touch input is ignored —
 * there is no hover to wait for — and every tooltip disappears on click, scroll, Escape and when
 * the pointer leaves the window.
 */
export function AdminTooltipLayer() {
  const tooltipId = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    /** Titles set aside while the pointer is over them, keyed by their element. */
    const stash = new Map<Element, string>();
    let host: Element | null = null;
    let visible = false;
    let describedBy: string | null = null;
    /** The element whose tooltip a click/Escape closed — it stays quiet until the pointer leaves it. */
    let dismissed: Element | null = null;
    let timer: number | undefined;
    let frame = 0;
    let closedAt = 0;
    let pointer: { x: number; y: number } | null = null;

    const inRoot = (element: Element) => Boolean(element.closest(".bp-root")) && !element.closest(".bp-tooltip");

    /** Puts back every set-aside title outside `keep`, unless the element was given a fresh one meanwhile. */
    function restore(keep?: Set<Element>) {
      for (const [element, text] of stash) {
        if (keep?.has(element)) continue;
        if (!element.hasAttribute("title")) element.setAttribute("title", text);
        stash.delete(element);
      }
    }

    /**
     * Silences the native bubble for everything from `start` up to the page root and returns the
     * innermost element that has tooltip text (or null). Titles of elements the pointer has left
     * are restored on the way.
     */
    function silence(start: Element | null): Element | null {
      if (!start || !inRoot(start)) { restore(); return null; }
      const chain = new Set<Element>();
      let found: Element | null = null;
      for (let node: Element | null = start; node && node !== document.body; node = node.parentElement) {
        chain.add(node);
        const title = node.getAttribute("title");
        if (title !== null) { stash.set(node, title); node.removeAttribute("title"); }
        if (!found && (node.getAttribute(TIP_ATTRIBUTE)?.trim() || stash.get(node)?.trim())) found = node;
      }
      restore(chain);
      return found;
    }

    const textOf = (element: Element) => element.getAttribute(TIP_ATTRIBUTE)?.trim() || stash.get(element)?.trim() || "";

    function syncToPointer() {
      const under = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null;
      silence(under);
    }

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
      const text = current ? textOf(current) : "";
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
      pointer = { x: event.clientX, y: event.clientY };
      const next = silence(event.target instanceof Element ? event.target : null);
      if (!next) { dismissed = null; hide(); return; }
      if (next === host) return;
      if (next === dismissed) { hide(); return; }
      dismissed = null;
      open(next, Date.now() - closedAt < WARM_WINDOW_MS ? WARM_DELAY_MS : SHOW_DELAY_MS);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      pointer = null;
      dismissed = null;
      hide();
      restore();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const next = silence(target);
      if (next && target?.matches(":focus-visible")) open(next, FOCUS_DELAY_MS);
    };
    const onFocusOut = () => {
      hide();
      syncToPointer();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") return;
      pointer = null;
      dismissed = null;
      hide();
      restore();
    };

    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; syncToPointer(); });
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      hide();
      restore();
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
