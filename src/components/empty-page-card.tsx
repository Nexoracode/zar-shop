"use client";

import { builderSectionProps } from "@/modules/page-builder/sections";

/**
 * What the page builder shows in the page when nothing is left on it: a card inviting to add a section. It is a
 * selectable block of its own ("page content") so the builder's frame and "add section" button work on it, and the
 * card itself is a builder control, so it stays clickable while the rest of the page is switched off.
 */
export function EmptyPageCard({ onAdd }: { onAdd: () => void }) {
  return (
    <section {...builderSectionProps("PAGE_CONTENT")} data-builder-draft="" className="grid min-h-[360px] place-items-center bg-white px-4 py-10">
      <button type="button" data-page-builder-ui onClick={onAdd} className="flex w-full max-w-[512px] cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#d0d5dd] bg-white px-8 py-6 text-right transition hover:border-[var(--pb-accent)] hover:bg-[#f7faff]">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-xl border border-[#e4e7ec] bg-white shadow-sm" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#232934" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 21H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7.5" />
            <path d="M18 17v6M15 20h6" />
          </svg>
        </span>
        <span className="grid min-w-0 gap-1">
          <strong className="text-base font-medium text-[var(--pb-accent)]">افزودن بخش جدید</strong>
          <span className="text-xs text-[#475467]">هنوز ابزاری برای نمایش در این بخش اضافه نشده است.</span>
        </span>
      </button>
    </section>
  );
}
