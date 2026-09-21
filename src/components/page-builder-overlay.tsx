"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { BUILDER_SECTION_ATTRIBUTE, BUILDER_SECTION_SELECTOR, builderSectionLabel } from "@/modules/page-builder/sections";

// The builder's controls and what they open into <body> (see `page-builder.css`).
const UI_SELECTOR = "[data-page-builder-ui], .bp-root, [data-trigger]";
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

/**
 * How far down the page the store's header covers the top of the window: its bottom edge when it is stuck to the top
 * (the store's "sticky header" setting), otherwise nothing — a header that scrolls away with the page never covers a section.
 */
function stickyHeaderBottom() {
  const header = document.querySelector<HTMLElement>(`[${BUILDER_SECTION_ATTRIBUTE}="HEADER"]`);
  if (!header) return 0;
  const position = getComputedStyle(header).position;
  return position === "sticky" || position === "fixed" ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

/** Puts a frame over `target`; the part of it that lies under the sticky header (`coverBottom`) is cut off, so the lines never draw over the header. */
function placeBox(node: HTMLElement | null, target: HTMLElement | null, coverBottom = 0) {
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
  // The frame is a pair of lines across the whole page width (not a box around the section), so it starts at the
  // window's left edge and is as wide as the page; only its height follows the section.
  node.style.transform = `translate(0px, ${rect.top}px)`;
  node.style.width = `${document.documentElement.clientWidth}px`;
  node.style.height = `${rect.height}px`;
  const covered = target.getAttribute(BUILDER_SECTION_ATTRIBUTE) === "HEADER" ? 0 : Math.min(rect.height, Math.max(0, coverBottom - rect.top));
  node.style.clipPath = covered > 0 ? `inset(${covered}px 0 0 0)` : "none";
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
 * that `src/styles/page-builder.css` describes, (b) marks the section under the pointer with a pale pair of lines above and below it, and
 * (c) lets the viewer select one section, drawing its frame (the same lines, in the strong blue), name tag and action
 * toolbar. The frames are lines across the whole page width, not a box around the section.
 *
 * The frames are fixed-position boxes positioned from the section's live bounding rect rather than
 * styles on the section itself: the storefront's `overflow-hidden` wrappers would clip them, and this
 * way nothing in the templates has to know about the builder beyond the section attribute.
 * Positions are written straight to the DOM in a rAF loop so scrolling never re-renders React.
 */
export function PageBuilderOverlay({ active, layoutKey, onMove, onRemove, onOpenSettings, onEdit, onAdd }: {
  active: boolean;
  /** Changes whenever the draft layout does, so the frame re-measures and follows a section that moved. */
  layoutKey: string;
  onMove: (sectionId: string, direction: -1 | 1) => void;
  onRemove: (sectionId: string) => void;
  onOpenSettings: (sectionId: string) => void;
  onEdit: (sectionId: string) => void;
  /** "Add a section" pressed on this section: the new one goes right below it. */
  onAdd: (sectionId: string) => void;
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
    const coverBottom = stickyHeaderBottom();
    placeBox(hoverBoxRef.current, hoveredRef.current === selectedRef.current ? null : hoveredRef.current, coverBottom);
    const rect = placeBox(selectedBoxRef.current, selectedRef.current, coverBottom);
    const toolbar = toolbarRef.current;
    if (!rect || !toolbar) return;
    // Sit at the bottom of the section, but never below the dock: a tall section whose bottom is off
    // screen would otherwise hide its own controls.
    const dockTop = document.querySelector(DOCK_SELECTOR)?.getBoundingClientRect().top ?? window.innerHeight;
    const bottom = Math.min(rect.bottom, dockTop) - TOOLBAR_MARGIN;
    // ...and never under a sticky header either.
    const top = Math.max(bottom - toolbar.offsetHeight, rect.top + TOOLBAR_MARGIN, selectedRef.current?.getAttribute(BUILDER_SECTION_ATTRIBUTE) === "HEADER" ? 0 : coverBottom + TOOLBAR_MARGIN);
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
      <div ref={hoverBoxRef} className="pointer-events-none fixed left-0 top-0 z-[125] hidden border-x-0 border-y-2 border-solid border-[var(--pb-frame)]" />
      <div ref={selectedBoxRef} className="pointer-events-none fixed left-0 top-0 z-[126] hidden border-x-0 border-y-[3px] border-solid border-[var(--pb-accent)]">
        <span className="absolute right-0 top-0 rounded-bl-lg bg-[var(--pb-accent-strong)] px-3.5 py-1 text-xs font-bold text-white">{builderSectionLabel(selectedId ?? undefined)}</span>
        <div ref={toolbarRef} data-page-builder-ui className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          {selectedId !== "PAGE_CONTENT" && (
            <div className={toolbarPillClass}>
              <ToolbarButton label="ویرایش بخش" onPress={() => selectedId && onEdit(selectedId)}><Pencil size={20} /></ToolbarButton>
              <ToolbarButton label="تنظیمات نمایش" onPress={() => selectedId && onOpenSettings(selectedId)}><SectionSettingsIcon /></ToolbarButton>
              <span className={toolbarSeparatorClass} />
              <ToolbarButton label="بردن به بالا" onPress={() => selectedId && onMove(selectedId, -1)}><ArrowUp size={20} /></ToolbarButton>
              <ToolbarButton label="بردن به پایین" onPress={() => selectedId && onMove(selectedId, 1)}><ArrowDown size={20} /></ToolbarButton>
              <span className={toolbarSeparatorClass} />
              <ToolbarButton label="حذف" onPress={() => selectedId && onRemove(selectedId)}><Trash2 size={20} /></ToolbarButton>
            </div>
          )}
          <div className={toolbarPillClass}>
            <ToolbarButton label="افزودن بخش" onPress={() => selectedId && onAdd(selectedId)}><Plus size={20} /></ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
}
