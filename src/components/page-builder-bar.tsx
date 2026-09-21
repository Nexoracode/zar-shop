"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { ArrowUpRight, ChevronDown, ChevronUp, Redo2, Undo2 } from "lucide-react";

type PageBuilderBarProps = {
  /** Whether the dock's panel is expanded (the tab toggles it). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the page is in edit mode; swaps the panel's controls (see `PageBuilderOverlay` for the mode itself). */
  editing: boolean;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canSave: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
};

/**
 * The storefront page builder's dock. It is pinned to the bottom of the viewport (so it follows the
 * scroll), collapsed to just its dark tab until the tab is pressed, and then a compact panel grows
 * upward out of it. The panel animates through a 0fr → 1fr grid row, so its height is never measured
 * and the tab rides on top of it in both states.
 *
 * The panel has two faces: the entry one (start editing / go to the admin panel) and, once editing
 * starts, the working one (save / cancel / undo / redo).
 *
 * Only mounted for viewers allowed to edit the storefront (see `src/app/page.tsx`); this component
 * itself does no permission check.
 */
export function PageBuilderBar({ open, onOpenChange, editing, onStartEditing, onSave, onCancel, onUndo, onRedo, canSave, canUndo, canRedo, saving }: PageBuilderBarProps) {
  const panelId = useId();
  // Which face is drawn. It follows `editing` at once, except when leaving edit mode while the panel is
  // sliding down (cancel): then the working face stays until the slide ends, so the buttons don't swap
  // in front of the viewer mid-animation.
  const [editingFace, setEditingFace] = useState(editing);
  if (editing !== editingFace && (editing || open)) setEditingFace(editing);

  return (
    // Below lg the storefront's bottom tab bar (66px) owns the screen edge, so the dock sits on top of it.
    <div dir="rtl" data-page-builder-dock className="pointer-events-none fixed inset-x-0 bottom-[66px] z-[130] flex flex-col items-center lg:bottom-0">
      <Button
        type="button"
        variant="ghost"
        data-page-builder-ui
        aria-label={open ? "بستن نوار صفحه‌ساز" : "باز کردن نوار صفحه‌ساز"}
        aria-expanded={open}
        aria-controls={panelId}
        onPress={() => onOpenChange(!open)}
        className="pointer-events-auto h-5 min-h-5 w-20 min-w-20 rounded-b-none rounded-t-lg bg-[var(--pb-tool-bg)] p-0 text-white hover:bg-[#232a3a]"
      >
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </Button>

      <div id={panelId} inert={!open} className={`grid w-full transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} onTransitionEnd={(event) => { if (event.target === event.currentTarget && !open) setEditingFace(editing); }}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">
            <div data-page-builder-ui className="pointer-events-auto mx-auto flex max-w-[480px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_12px_40px_rgba(15,23,42,.18)]">
              {editingFace ? (
                <>
                  <Button type="button" variant="primary" style={brandPrimaryButtonStyle} isPending={saving} isDisabled={!canSave || saving} onPress={onSave} className="min-h-10 rounded-lg px-6 text-sm font-bold">
                    {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}ذخیره</>}
                  </Button>
                  <Button type="button" variant="outline" isDisabled={saving} onPress={onCancel} className="min-h-10 rounded-lg px-5 text-sm font-bold">
                    انصراف
                  </Button>
                  <div className="mr-auto flex items-center gap-1">
                    <Button type="button" isIconOnly variant="ghost" isDisabled={!canUndo || saving} onPress={onUndo} aria-label="بازگرداندن تغییر" className="size-10 min-h-10 min-w-10 text-[var(--muted)]">
                      <Undo2 size={20} />
                    </Button>
                    <Button type="button" isIconOnly variant="ghost" isDisabled={!canRedo || saving} onPress={onRedo} aria-label="انجام مجدد تغییر" className="size-10 min-h-10 min-w-10 text-[var(--muted)]">
                      <Redo2 size={20} />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/admin" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[var(--foreground)] transition hover:text-[var(--brand-primary)]">
                    <ArrowUpRight size={16} />
                    ورود به مدیریت
                  </Link>
                  <Button type="button" variant="primary" style={brandPrimaryButtonStyle} onPress={onStartEditing} className="mr-auto min-h-10 rounded-lg px-6 text-sm font-bold">
                    ویرایش ظاهر صفحه
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
