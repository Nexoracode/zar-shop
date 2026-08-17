"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

export type AccountPaymentHistoryItem = { id: string; status: string; statusClassName: string; amount: string; date: string; referenceId: string | null };

export function AccountPaymentHistory({ items }: { items: AccountPaymentHistoryItem[] }) {
  if (!items.length) return null;
  return <Accordion dir="rtl" variant="surface" hideSeparator className="w-full bg-transparent p-0" aria-label="تاریخچه تراکنش‌ها">
    <Accordion.Item id="payment-history" className="border-0 bg-transparent px-0">
      <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-start gap-2 py-2 text-right text-xs font-bold text-[var(--brand-primary)]"><span>تاریخچه تراکنش‌ها</span><Accordion.Indicator><ChevronDown size={15} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
      <Accordion.Panel><Accordion.Body className="grid gap-2 pb-2 pt-3">{items.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-3 text-xs sm:grid-cols-3"><span>{item.date}</span><span className={item.statusClassName}>{item.status}</span><span className="sm:text-left">{item.amount}{item.referenceId ? <small className="mr-2 text-[10px] text-[var(--muted)]" dir="ltr">{item.referenceId}</small> : null}</span></div>)}</Accordion.Body></Accordion.Panel>
    </Accordion.Item>
  </Accordion>;
}
