"use client";

import { Accordion } from "@heroui/react";
import { CheckCircle2, ChevronDown } from "lucide-react";

export type AccountPaymentHistoryItem = { id: string; status: string; statusClassName: string; amount: string; date: string; referenceId: string | null; gateway: string; isSuccessful: boolean };

export function AccountPaymentHistory({ items }: { items: AccountPaymentHistoryItem[] }) {
  if (!items.length) return null;
  return <Accordion dir="rtl" variant="surface" hideSeparator className="w-full bg-transparent p-0" aria-label="تاریخچه تراکنش‌ها">
    <Accordion.Item id="payment-history" className="border-0 bg-transparent px-0">
      <Accordion.Heading><Accordion.Trigger className="mr-auto flex w-fit items-center gap-2 py-2 text-right text-[15px] font-bold text-[var(--brand-primary)]"><span>تاریخچه تراکنش‌ها</span><Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
      <Accordion.Panel><Accordion.Body className="grid gap-3 pb-2 pt-3">{items.map((item) => <div key={item.id} className="grid items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs sm:grid-cols-[minmax(0,1fr)_120px_140px] sm:px-5 sm:py-4">
        <div className="grid min-w-0 gap-2">
          <strong className="text-sm text-[var(--foreground)]">مبلغ سفارش - <span className={item.statusClassName}>پرداخت {item.status}</span></strong>
          <span className="inline-flex items-center gap-2 text-[var(--muted)]">{item.isSuccessful ? <CheckCircle2 size={16} className="shrink-0 fill-emerald-500 text-white" /> : null}<span>درگاه</span><b className="text-[var(--foreground)]">{item.gateway}</b></span>
          <span className="min-w-0 text-[var(--muted)]">شماره پیگیری <b className="mr-1 inline-block max-w-full truncate align-bottom font-medium text-[var(--foreground)]" dir="ltr" title={item.referenceId ?? undefined}>{item.referenceId ?? "—"}</b></span>
        </div>
        <strong className="font-medium text-[var(--foreground)]">{item.date}</strong>
        <strong className="font-bold text-[var(--foreground)] sm:text-left">{item.amount}</strong>
      </div>)}</Accordion.Body></Accordion.Panel>
    </Accordion.Item>
  </Accordion>;
}
