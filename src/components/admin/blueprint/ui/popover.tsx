"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * A panel anchored to a trigger, rendered into `document.body` and positioned with
 * `position: fixed`.
 *
 * An absolutely positioned panel inside the header extends the document's scrollable area as
 * soon as it reaches past the bottom of the page, which stretches the page downwards. Fixed
 * positioning in a portal cannot do that.
 */
export function BpPopover({ open, anchorRef, onClose, label, width = 300, placement: side = "below", children }: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  width?: number;
  /**
   * `below` hangs the panel under its trigger, end edges aligned. `beside` puts it alongside —
   * what the collapsed admin rail needs, since a panel under an icon in a 76px column would sit
   * on top of the next icon.
   */
  placement?: "below" | "beside";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelWidth = Math.min(width, window.innerWidth - 16);
    const height = panelRef.current?.offsetHeight ?? 240;
    const openUpwards = side === "below" && rect.bottom + height > window.innerHeight && rect.top > height;
    // `beside` lines the panel's top up with the trigger's; `below` hangs it under.
    const preferred = side === "beside" ? rect.top : openUpwards ? rect.top - height - 6 : rect.bottom + 6;
    const top = Math.min(Math.max(8, preferred), Math.max(8, window.innerHeight - height - 8));
    // RTL: `below` lines the panel's end edge up with the trigger's; `beside` sets it just past
    // the trigger's near edge, which in RTL means to its left. Both stay inside the viewport.
    const wanted = side === "beside" ? rect.left - panelWidth - 6 : rect.right - panelWidth;
    const left = Math.min(Math.max(8, wanted), window.innerWidth - panelWidth - 8);
    setPlacement({ top, left });
  }, [anchorRef, width, side]);

  // The panel is mounted as soon as it opens but stays invisible until measured, so this single
  // layout pass reads a real height instead of guessing and then correcting.
  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, onClose, reposition, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      dir="rtl"
      role="dialog"
      aria-label={label}
      // `position` is set inline: `.bp-frame` declares `position: relative` from an unlayered
      // stylesheet, which outranks Tailwind's layered `fixed` utility.
      style={{ position: "fixed", top: placement?.top ?? 0, left: placement?.left ?? 0, visibility: placement ? undefined : "hidden", width: Math.min(width, typeof window === "undefined" ? width : window.innerWidth - 16), zIndex: 140 }}
      className="bp-root bp-frame bg-[var(--bp-bg)] p-4 shadow-[var(--bp-shadow-lg)]"
    >
      {children}
    </div>,
    document.body,
  );
}
