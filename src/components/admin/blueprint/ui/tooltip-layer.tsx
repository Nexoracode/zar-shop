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

type Target = { host: Element; text: string; title: string | null; describedBy: string | null };
type Anchor = { text: string; rect: DOMRect };
type Placement = { top: number; left: number; side: "top" | "bottom"; arrowX: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function tipTextOf(element: Element) {
  const own = element.getAttribute(TIP_ATTRIBUTE)?.trim();
  if (own) return own;
  return element.getAttribute("title")?.trim() || null;
}

/** The nearest element (starting at `start`) that carries tooltip text, provided it lives inside the admin root. */
function findHost(start: EventTarget | null): Element | null {
  let node = start instanceof Element ? start : null;
  for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
    if (node.classList.contains("bp-tooltip")) return null;
    if (tipTextOf(node)) return node.closest(".bp-root") ? node : null;
  }
  return null;
}

/**
 * The admin panel's tooltip, for every `title="…"` and `data-bp-tip="…"` inside `.bp-root`.
 *
 * The browser's own bubble is plain, slow and unstyled, and the panel has ~180 of them, so rather
 * than editing each call site this one listener takes over: while a control is hovered (or
 * keyboard-focused) its `title` is set aside so the native bubble stays quiet, and restored the
 * moment the tooltip closes. Multi-line text is laid out as a heading with label/value rows (see
 * `parseTooltipText`). SVG shapes, which cannot use `title=`, opt in through `data-bp-tip`.
 *
 * Touch input is ignored — there is no hover to wait for — and every tooltip disappears on click,
 * scroll, Escape and when the pointer leaves the window.
 */
export function AdminTooltipLayer() {
  const tooltipId = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let target: Target | null = null;
    let timer: number | undefined;
    let closedAt = 0;

    function release() {
      window.clearTimeout(timer);
      if (!target) return;
      const { host, title, describedBy } = target;
      target = null;
      if (title !== null && !host.hasAttribute("title")) host.setAttribute("title", title);
      if (describedBy) host.setAttribute("aria-describedby", describedBy); else host.removeAttribute("aria-describedby");
      closedAt = Date.now();
      setShown(false);
      setAnchor(null);
      setPlacement(null);
    }

    function reveal() {
      const current = target;
      if (!current || !current.host.isConnected) { release(); return; }
      const rect = current.host.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { release(); return; }
      current.host.setAttribute("aria-describedby", [current.describedBy, tooltipId].filter(Boolean).join(" "));
      setAnchor({ text: current.text, rect });
    }

    function engage(host: Element, delay: number) {
      if (target?.host === host) return;
      release();
      const text = tipTextOf(host);
      if (!text) return;
      // Set the native bubble aside for as long as ours can appear, whichever attribute supplied the text.
      const title = host.getAttribute("title");
      if (title !== null) host.removeAttribute("title");
      target = { host, text, title, describedBy: host.getAttribute("aria-describedby") };
      timer = window.setTimeout(reveal, delay);
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const host = findHost(event.target);
      if (host) engage(host, Date.now() - closedAt < WARM_WINDOW_MS ? WARM_DELAY_MS : SHOW_DELAY_MS);
      else release();
    };
    const onPointerOut = (event: PointerEvent) => { if (!event.relatedTarget) release(); };
    const onFocusIn = (event: FocusEvent) => {
      const host = findHost(event.target);
      if (host instanceof HTMLElement && host.matches(":focus-visible")) engage(host, FOCUS_DELAY_MS);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") release(); };
    const onVisibility = () => { if (document.visibilityState !== "visible") release(); };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("pointerdown", release);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", release);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", release, { capture: true, passive: true });
    window.addEventListener("resize", release);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", release);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", release);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", release, { capture: true });
      window.removeEventListener("resize", release);
      release();
    };
  }, [tooltipId]);

  // The bubble is mounted invisible first, so this one measuring pass reads its real size and the
  // position it lands in is already final when it fades in.
  useLayoutEffect(() => {
    if (!anchor) return;
    const tip = tipRef.current;
    if (!tip) return;
    function place(current: HTMLDivElement, at: Anchor) {
      const width = current.offsetWidth;
      const height = current.offsetHeight;
      const { rect } = at;
      const roomAbove = rect.top - EDGE;
      const roomBelow = window.innerHeight - rect.bottom - EDGE;
      const side = roomAbove >= height + GAP || roomAbove >= roomBelow ? "top" : "bottom";
      const top = side === "top" ? rect.top - height - GAP : rect.bottom + GAP;
      const centre = rect.left + rect.width / 2;
      const left = clamp(centre - width / 2, EDGE, window.innerWidth - width - EDGE);
      setPlacement({ top: clamp(top, EDGE, window.innerHeight - height - EDGE), left, side, arrowX: clamp(centre - left, ARROW_INSET, width - ARROW_INSET) });
    }
    place(tip, anchor);
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
