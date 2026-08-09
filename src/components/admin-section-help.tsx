"use client";

import { useState } from "react";
import { Button, Popover, ScrollShadow } from "@heroui/react";
import { CircleAlert, Info, Lightbulb, X } from "lucide-react";

export type AdminSectionHelpBlock = {
  title: string;
  description?: string;
  items?: string[];
  tone?: "default" | "important";
};

type AdminSectionHelpProps = {
  title: string;
  summary: string;
  blocks: AdminSectionHelpBlock[];
  placement?: "bottom left" | "bottom right" | "top left" | "top right";
};

export function AdminSectionHelp({ title, summary, blocks, placement = "bottom left" }: AdminSectionHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        aria-label={`راهنمای ${title}`}
        title={`راهنمای ${title}`}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-500 outline-none transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <Info size={17} />
      </Popover.Trigger>
      <Popover.Content
        dir="rtl"
        placement={placement}
        className="z-[190] w-[min(92vw,400px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-right text-slate-800 shadow-2xl"
      >
        <Popover.Dialog dir="rtl" className="overflow-hidden p-0 text-right outline-none">
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 bg-slate-50/80 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700">
              <Info size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <Popover.Heading className="m-0 text-sm font-black text-slate-800">راهنمای {title}</Popover.Heading>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{summary}</p>
            </div>
            <Button type="button" isIconOnly size="sm" variant="ghost" aria-label="بستن راهنما" onPress={() => setIsOpen(false)} className="size-8 min-h-8 min-w-8 shrink-0 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700">
              <X size={15} />
            </Button>
          </div>

          <ScrollShadow
            orientation="vertical"
            size={28}
            hideScrollBar={false}
            tabIndex={0}
            aria-label={`متن راهنمای ${title}`}
            className="admin-content-scroll touch-pan-y overscroll-contain p-4 [scrollbar-gutter:stable]"
            style={{ maxHeight: "min(480px, calc(100dvh - 170px))" }}
          >
            <div className="grid gap-4">
              {blocks.map((block, index) => (
                <section
                  key={`${block.title}-${index}`}
                  className={block.tone === "important" ? "rounded-lg border border-amber-200 bg-amber-50 p-3" : "grid gap-2"}
                >
                  <div className="flex items-center gap-2">
                    {block.tone === "important" ? <CircleAlert size={15} className="shrink-0 text-amber-600" /> : <Lightbulb size={15} className="shrink-0 text-violet-600" />}
                    <h3 className="m-0 text-xs font-black text-slate-700">{block.title}</h3>
                  </div>
                  {block.description && <p className="m-0 text-[11px] leading-6 text-slate-500">{block.description}</p>}
                  {block.items?.length ? (
                    <ol className="m-0 grid list-none gap-2 p-0">
                      {block.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-[11px] leading-6 text-slate-600">
                          <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-violet-50 text-[9px] font-black text-violet-700">
                            {(itemIndex + 1).toLocaleString("fa-IR")}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </section>
              ))}
            </div>
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
