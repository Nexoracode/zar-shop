"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BuilderPart } from "@/components/builder-part";
import { DragScrollRow } from "@/components/drag-scroll-row";

/**
 * The card slider's frame: the title and description on the right of its header, the prev/next arrows (and, when the
 * store owner turns it on, the "view all" link) on the left, and the scrolling row of cards under it. It is a client
 * component because the arrows drive the row; everything it shows arrives as plain values. The pieces are `BuilderPart`s
 * of the list's section, like in the other looks.
 */
export function ProductListSliderShell({ sectionId, title, descriptionHtml, moreHref, moreLabel, hidden, editable, className, children }: {
  sectionId: string;
  title: string;
  descriptionHtml: string;
  moreHref: string;
  moreLabel: string;
  /** Which switchable pieces are switched off. */
  hidden: { title: boolean; description: boolean; more: boolean; arrows: boolean };
  editable: boolean;
  /** The classes of the scrolling row. */
  className: string;
  children: ReactNode;
}) {
  const part = (id: keyof typeof hidden) => ({ section: sectionId, id, hidden: hidden[id], editable });
  const arrowClass = "size-9 min-h-9 min-w-9 rounded-full border border-[#dfe2e8] bg-white text-[#232934] shadow-sm hover:bg-[#f4f5f7] disabled:opacity-40";
  return (
    <DragScrollRow
      ariaLabel={title}
      className={className}
      topSlot={({ canGoBack, canGoForward, scroll }) => (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <BuilderPart {...part("title")}><h2 className="m-0 text-xl font-bold text-[#232934] sm:text-2xl">{title}</h2></BuilderPart>
            {descriptionHtml && <BuilderPart {...part("description")}><div className="mb-0 mt-1 text-xs leading-6 text-[#858b95] sm:text-sm [&_a]:underline [&_p]:m-0 [&_mark]:rounded-sm [&_mark]:px-0.5" dangerouslySetInnerHTML={{ __html: descriptionHtml }} /></BuilderPart>}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <BuilderPart {...part("more")}><Link href={moreHref} className="inline-flex items-center gap-1 text-xs font-bold text-[#232934] transition hover:text-black">{moreLabel}<ChevronLeft size={15} /></Link></BuilderPart>
            <BuilderPart {...part("arrows")}>
              <div className="hidden items-center gap-2 sm:flex" dir="rtl">
                <Button type="button" isIconOnly variant="secondary" aria-label={`${title}، موارد قبلی`} isDisabled={!canGoBack} onPress={() => scroll(false)} className={arrowClass}><ChevronRight size={18} /></Button>
                <Button type="button" isIconOnly variant="secondary" aria-label={`${title}، موارد بعدی`} isDisabled={!canGoForward} onPress={() => scroll(true)} className={arrowClass}><ChevronLeft size={18} /></Button>
              </div>
            </BuilderPart>
          </div>
        </div>
      )}
    >
      {children}
    </DragScrollRow>
  );
}
