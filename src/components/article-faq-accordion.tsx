"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type ArticleFaqItem = { id: string; question: string; answer: string };

export function ArticleFaqAccordion({ faqs }: { faqs: ArticleFaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  if (faqs.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7">
      <h2 className="m-0 mb-1 text-[19px] font-bold text-[var(--foreground)]">سوالات متداول</h2>
      <div>
        {faqs.map((faq) => {
          const open = faq.id === openId;
          return (
            <div key={faq.id} className="border-b border-[var(--border)] last:border-b-0">
              <Button
                type="button"
                variant="ghost"
                onPress={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                className="flex h-auto min-h-0 w-full items-center justify-between gap-3 rounded-none border-none bg-transparent px-0 py-4 text-right text-[14px] font-bold text-[var(--foreground)] hover:bg-transparent"
              >
                <span>{faq.question}</span>
                {open ? <ChevronUp size={17} className="shrink-0 text-[var(--brand-accent)]" /> : <ChevronDown size={17} className="shrink-0 text-[var(--brand-accent)]" />}
              </Button>
              {open && <p className="m-0 mb-4 text-[13.5px] leading-8 text-[var(--muted)]">{faq.answer}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
