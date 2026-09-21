"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@heroui/react";
import { ChevronDown, ChevronUp, Redo2, Undo2 } from "lucide-react";

const primaryButtonStyle = { "--button-bg": "var(--brand-primary)", "--button-bg-hover": "color-mix(in srgb, var(--brand-primary) 90%, black)", "--button-bg-pressed": "color-mix(in srgb, var(--brand-primary) 82%, black)", "--button-fg": "var(--brand-primary-foreground)" } as CSSProperties;

/**
 * The storefront page builder's dock. It is pinned to the bottom of the viewport (so it follows the
 * scroll), collapsed to just its dark tab until the tab is pressed, and then the action bar
 * (save / cancel / undo / redo) grows upward out of it. The panel animates through a 0fr → 1fr grid
 * row, so its height is never measured and the tab rides on top of it in both states.
 *
 * Only mounted for viewers allowed to edit the storefront (see `src/app/page.tsx`); this component
 * itself does no permission check.
 */
export function PageBuilderBar() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    // Below lg the storefront's bottom tab bar (66px) owns the screen edge, so the dock sits on top of it.
    <div dir="rtl" className="pointer-events-none fixed inset-x-0 bottom-[66px] z-[130] flex flex-col items-center lg:bottom-0">
      <Button
        type="button"
        variant="ghost"
        aria-label={open ? "بستن نوار صفحه‌ساز" : "باز کردن نوار صفحه‌ساز"}
        aria-expanded={open}
        aria-controls={panelId}
        onPress={() => setOpen((current) => !current)}
        className="pointer-events-auto h-5 min-h-5 w-20 min-w-20 rounded-b-none rounded-t-lg bg-[#161b26] p-0 text-white hover:bg-[#232a3a]"
      >
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </Button>

      <div id={panelId} inert={!open} className={`grid w-full transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 lg:px-6">
            <div className="pointer-events-auto mx-auto flex max-w-[1100px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_12px_40px_rgba(15,23,42,.18)]">
              <Button type="button" variant="primary" style={primaryButtonStyle} className="min-h-10 rounded-lg px-6 text-sm font-bold">
                ذخیره
              </Button>
              <Button type="button" variant="outline" onPress={() => setOpen(false)} className="min-h-10 rounded-lg px-5 text-sm font-bold">
                انصراف
              </Button>
              <div className="mr-auto flex items-center gap-1">
                <Button type="button" isIconOnly variant="ghost" isDisabled aria-label="بازگرداندن تغییر" className="size-10 min-h-10 min-w-10 text-[var(--muted)]">
                  <Undo2 size={20} />
                </Button>
                <Button type="button" isIconOnly variant="ghost" isDisabled aria-label="انجام مجدد تغییر" className="size-10 min-h-10 min-w-10 text-[var(--muted)]">
                  <Redo2 size={20} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
