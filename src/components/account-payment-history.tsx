"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

export type AccountPaymentHistoryItem = { id: string; status: string; statusClassName: string; amount: string; date: string; referenceId: string | null };

export function AccountPaymentHistory({ items }: { items: AccountPaymentHistoryItem[] }) {
  if (!items.length) return null;
  return <Accordion dir="rtl" variant="surface" hideSeparator className="w-full bg-transparent p-0" aria-label="تاریخچه تراکنش‌ها">
    <Accordion.Item id="payment-history" className="border-0 bg-transparent px-0">
      <Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-start gap-2 py-2 text-right text-[15px] font-bold text-[var(--brand-primary)]"><span>تاریخچه تراکنش‌ها</span><Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
      <Accordion.Panel><Accordion.Body className="grid gap-3 pb-2 pt-3">{items.map((item) => <div key={item.id} className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4 text-xs sm:grid-cols-2">
        <div className="grid min-w-0 gap-1"><span className="text-[var(--muted)]">تاریخ تراکنش</span><strong className="font-medium text-[var(--foreground)]">{item.date}</strong></div>
        <div className="grid min-w-0 gap-1 sm:text-left"><span className="text-[var(--muted)]">وضعیت</span><strong className={item.statusClassName}>{item.status}</strong></div>
        <div className="grid min-w-0 gap-1"><span className="text-[var(--muted)]">مبلغ</span><strong className="font-bold text-[var(--foreground)]">{item.amount}</strong></div>
        <div className="grid min-w-0 gap-1 sm:text-left"><span className="text-[var(--muted)]">شناسه مرجع</span><strong className="truncate font-medium text-[var(--foreground)]" dir="ltr" title={item.referenceId ?? undefined}>{item.referenceId ?? "—"}</strong></div>
      </div>)}</Accordion.Body></Accordion.Panel>
    </Accordion.Item>
  </Accordion>;
}
