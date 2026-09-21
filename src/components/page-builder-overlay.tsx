"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { BUILDER_SECTION_ATTRIBUTE, BUILDER_SECTION_SELECTOR, builderSectionLabel } from "@/modules/page-builder/sections";

const UI_SELECTOR = "[data-page-builder-ui]";
const DOCK_SELECTOR = "[data-page-builder-dock]";
const TOOLBAR_MARGIN = 12;

// Lucide has no icon for the "section settings" control in the reference design (two stacked toggle pills).
function SectionSettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3.5" width="18" height="7.5" rx="3.75" />
      <circle cx="7.25" cy="7.25" r="1.25" />
      <rect x="3" y="13" width="18" height="7.5" rx="3.75" />
      <circle cx="16.75" cy="16.75" r="1.25" />
    </svg>
  );
}

function placeBox(node: HTMLElement | null, target: HTMLElement | null) {
  if (!node) return null;
  if (!target || !target.isConnected) {
    node.style.display = "none";
    return null;
  }
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    node.style.display = "none";
    return null;
  }
  node.style.display = "block";
  node.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  return rect;
}

const toolButtonClass = "size-10 min-h-10 min-w-10 rounded-lg text-white hover:bg-white/10";
const toolbarPillClass = "flex items-center rounded-xl bg-[var(--pb-tool-bg)] p-1 shadow-[0_8px_24px_rgba(15,23,42,.28)]";
// The tooltip is portaled to <body>, outside the builder's own subtree, so it sets `dir` itself and
// sits above the frames (z-126) and the dock (z-130). Its arrow is recolored to match the dark fill.
const tooltipClass = "z-[140] rounded-lg bg-[var(--pb-tool-bg)] px-3 py-1.5 text-center text-xs font-medium text-white [&_[data-slot='overlay-arrow']]:fill-[var(--pb-tool-bg)] [&_[data-slot='overlay-arrow']]:stroke-transparent";

function ToolbarButton({ label, onPress, children }: { label: string; onPress?: () => void; children: ReactNode }) {
  return (
    <Tooltip delay={200} closeDelay={0}>
      <Tooltip.Trigger className="inline-flex">
        <Button type="button" isIconOnly variant="ghost" aria-label={label} onPress={onPress} className={toolButtonClass}>{children}</Button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow dir="rtl" className={tooltipClass}>{label}</Tooltip.Content>
    </Tooltip>
  );
}

const toolbarSeparatorClass = "mx-1 h-5 w-px bg-white/25";

/**
 * Edit-mode layer of the page builder. While `active` it (a) puts the page into the non-working state
 * that `src/styles/page-builder.css` describes, (b) outlines the section under the pointer, and
 * (c) lets the viewer select one section, drawing its frame, name tag and action toolbar.
 *
 * The frames are fixed-position boxes positioned from the section's live bounding rect rather than
 * styles on the section itself: the storefront's `overflow-hidden` wrappers would clip an outer glow,
 * and this way nothing in the templates has to know about the builder beyond the section attribute.
 * Positions are written straight to the DOM in a rAF loop so scrolling never re-renders React.
 */
export function PageBuilderOverlay({ active, layoutKey, onMove, onRemove }: {
  active: boolean;
  /** Changes whenever the draft layout does, so the frame re-measures and follows a section that moved. */
  layoutKey: string;
  onMove: (sectionId: string, direction: -1 | 1) => void;
  onRemove: (sectionId: string) => void;
}) {
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const selectedRef = useRef<HTMLElement | null>(null);
  const hoverBoxRef = useRef<HTMLDivElement>(null);
  const selectedBoxRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  const sync = useCallback(() => {
    frameRef.current = 0;
    placeBox(hoverBoxRef.current, hoveredRef.current === selectedRef.current ? null : hoveredRef.current);
    const rect = placeBox(selectedBoxRef.current, selectedRef.current);
    const toolbar = toolbarRef.current;
    if (!rect || !toolbar) return;
    // Sit at the bottom of the section, but never below the dock: a tall section whose bottom is off
    // screen would otherwise hide its own controls.
    const dockTop = document.querySelector(DOCK_SELECTOR)?.getBoundingClientRect().top ?? window.innerHeight;
    const bottom = Math.min(rect.bottom, dockTop) - TOOLBAR_MARGIN;
    const top = Math.max(bottom - toolbar.offsetHeight, rect.top + TOOLBAR_MARGIN);
    toolbar.style.top = `${top - rect.top}px`;
  }, []);

  const schedule = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(sync);
  }, [sync]);

  const select = useCallback((section: HTMLElement | null) => {
    selectedRef.current = section;
    setSelected(section);
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.dataset.pageBuilder = "editing";
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && !focused.closest(UI_SELECTOR)) focused.blur();

    const isBuilderUi = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(UI_SELECTOR));
    const sectionOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(BUILDER_SECTION_SELECTOR) : null);

    function onClick(event: MouseEvent) {
      if (isBuilderUi(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      select(sectionOf(event.target));
    }
    function onSubmit(event: SubmitEvent) {
      if (!isBuilderUi(event.target)) event.preventDefault();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        select(null);
        return;
      }
      // A focused link or button would still activate from the keyboard, which pointer-events can't stop.
      if ((event.key === "Enter" || event.key === " ") && !isBuilderUi(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    function onPointerMove(event: PointerEvent) {
      const section = isBuilderUi(event.target) ? null : sectionOf(event.target);
      if (section === hoveredRef.current) return;
      hoveredRef.current = section;
      schedule();
    }
    function onPointerLeave() {
      hoveredRef.current = null;
      schedule();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      delete root.dataset.pageBuilder;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      hoveredRef.current = null;
      selectedRef.current = null;
      setSelected(null);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [active, schedule, select]);

  // Content inside a framed section keeps changing height (images, the product feed loading more), so
  // follow its size, not only scroll and resize.
  useEffect(() => {
    if (!active || !selected) return;
    const observer = new ResizeObserver(schedule);
    observer.observe(selected);
    schedule();
    return () => observer.disconnect();
  }, [active, selected, schedule]);

  // A moved section lands somewhere else on the page; re-measure and bring it back into view.
  useEffect(() => {
    if (!active || !selectedRef.current) return;
    schedule();
    selectedRef.current.scrollIntoView({ block: "nearest" });
  }, [active, layoutKey, schedule]);

  const selectedId = selected?.getAttribute(BUILDER_SECTION_ATTRIBUTE) ?? null;

  if (!active) return null;

  return (
    <div dir="rtl">
      <div ref={hoverBoxRef} className="pointer-events-none fixed left-0 top-0 z-[125] hidden rounded-[3px] border-2 border-solid border-[var(--pb-accent)] shadow-[0_0_0_4px_var(--pb-glow),0_10px_28px_var(--pb-shadow)]" />
      <div ref={selectedBoxRef} className="pointer-events-none fixed left-0 top-0 z-[126] hidden border-[3px] border-solid border-[var(--pb-frame)] [border-top-color:var(--pb-accent-strong)] [border-top-style:dashed] [border-top-width:1px]">
        <span className="absolute right-0 top-0 rounded-bl-lg bg-[var(--pb-accent-strong)] px-3.5 py-1 text-xs font-bold text-white">{builderSectionLabel(selectedId ?? undefined)}</span>
        <div ref={toolbarRef} data-page-builder-ui className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className={toolbarPillClass}>
            <ToolbarButton label="ویرایش بخش"><Pencil size={20} /></ToolbarButton>
            <ToolbarButton label="تنظیمات نمایش"><SectionSettingsIcon /></ToolbarButton>
            <span className={toolbarSeparatorClass} />
            <ToolbarButton label="بردن به بالا" onPress={() => selectedId && onMove(selectedId, -1)}><ArrowUp size={20} /></ToolbarButton>
            <ToolbarButton label="بردن به پایین" onPress={() => selectedId && onMove(selectedId, 1)}><ArrowDown size={20} /></ToolbarButton>
            <span className={toolbarSeparatorClass} />
            <ToolbarButton label="حذف" onPress={() => selectedId && onRemove(selectedId)}><Trash2 size={20} /></ToolbarButton>
          </div>
          <div className={toolbarPillClass}>
            <ToolbarButton label="افزودن بخش"><Plus size={20} /></ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
}
