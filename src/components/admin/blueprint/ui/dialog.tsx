"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Minimal modal. Rendered through a portal on `document.body`, so it carries `dir="rtl"` on its
 * own content boundary instead of inheriting it from the page root, and re-declares `.bp-root`
 * so the blueprint tokens resolve outside the shell subtree.
 */
export type BpDialogSize = "sm" | "md" | "lg" | "full";

export function BpDialog({ open, title, description, onClose, children, actions, labelledBy, size = "sm" }: {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  labelledBy?: string;
  /** How wide the panel gets. Tall content scrolls inside the body, never the whole panel. */
  size?: BpDialogSize;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through a ref so the effects below depend on `open` alone. Callers pass an inline
  // arrow, so depending on `onClose` re-ran them on every render — and that focus() call pulled
  // the caret out of whatever field the reader was typing in, one character at a time.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="bp-root bp-dialog-backdrop"
      dir="rtl"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`bp-dialog bp-dialog-${size} bp-frame`} dir="rtl">
        {title && <div className="bp-dialog-title" id={labelledBy}>{title}</div>}
        {description && <p className="bp-dialog-body">{description}</p>}
        {children && <div className="bp-dialog-content">{children}</div>}
        {actions && <div className="bp-dialog-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
