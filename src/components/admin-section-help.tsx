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
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] outline-none transition hover:border-[var(--accent)]/35 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        <Info size={17} />
      </Popover.Trigger>
      <Popover.Content
        dir="rtl"
        placement={placement}
        className="z-[190] w-[min(92vw,400px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--overlay)] p-0 text-right text-[var(--overlay-foreground)] shadow-2xl"
      >
        <Popover.Dialog
          dir="rtl"
          className="flex min-h-0 flex-col overflow-hidden p-0 text-right outline-none"
          style={{ maxHeight: "inherit" }}
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border)] bg-[var(--surface-secondary)] p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Info size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <Popover.Heading className="m-0 text-sm font-bold text-[var(--overlay-foreground)]">راهنمای {title}</Popover.Heading>
              <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{summary}</p>
            </div>
            <Button type="button" isIconOnly size="sm" variant="ghost" aria-label="بستن راهنما" onPress={() => setIsOpen(false)} className="size-8 min-h-8 min-w-8 shrink-0 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--foreground)]">
              <X size={15} />
            </Button>
          </div>

          <ScrollShadow
            orientation="vertical"
            size={28}
            hideScrollBar={false}
            tabIndex={0}
            aria-label={`متن راهنمای ${title}`}
            className="admin-content-scroll min-h-0 flex-1 touch-pan-y overscroll-contain p-4 [scrollbar-gutter:stable]"
          >
            <div className="grid gap-4">
              {blocks.map((block, index) => (
                <section
                  key={`${block.title}-${index}`}
                  className={block.tone === "important" ? "rounded-lg border border-[var(--warning)]/35 bg-[var(--warning)]/10 p-3" : "grid gap-2"}
                >
                  <div className="flex items-center gap-2">
                    {block.tone === "important" ? <CircleAlert size={15} className="shrink-0 text-[var(--warning)]" /> : <Lightbulb size={15} className="shrink-0 text-[var(--accent)]" />}
                    <h3 className="m-0 text-xs font-bold text-[var(--overlay-foreground)]">{block.title}</h3>
                  </div>
                  {block.description && <p className="m-0 text-[11px] leading-6 text-[var(--muted)]">{block.description}</p>}
                  {block.items?.length ? (
                    <ol className="m-0 grid list-none gap-2 p-0">
                      {block.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-[11px] leading-6 text-[var(--muted)]">
                          <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent)]/10 text-[9px] font-bold text-[var(--accent)]">
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
