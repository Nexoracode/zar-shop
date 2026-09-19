"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { ListChecks } from "lucide-react";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import { formatMoney } from "@/lib/format";

const guide = [
  "مبلغ قابل واریز را به کارت فروشگاه منتقل کنید.",
  "رسید بانکی را بارگذاری کنید یا شماره کارت مبدأ و کد رهگیری را وارد کنید.",
  "پس از تأیید فروشگاه، سفارش شما پرداخت‌شده ثبت و آماده‌سازی می‌شود.",
];

/** The side column of the transfer page: what is being paid, how long is left, and the three steps. */
export function CardToCardSummary({ orderNumber, itemCount, total, walletApplied, amount, currency, expiresAt, warningMinutes, canChangeMethod }: {
  orderNumber: string;
  itemCount: number;
  total: number;
  walletApplied: number;
  amount: number;
  currency: "IRR" | "IRT";
  expiresAt: string | null;
  warningMinutes: number;
  canChangeMethod: boolean;
}) {
  return (
    <aside className="grid min-w-0 gap-5 lg:sticky lg:top-24">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><strong className="text-base font-bold">خلاصه پرداخت</strong><span className="text-xs text-[var(--muted)]">{itemCount.toLocaleString("fa-IR")} کالا</span></div>
        <p className="mb-3 mt-0 text-xs text-[var(--muted)]">سفارش <b dir="ltr">{orderNumber}</b></p>
        <dl className="m-0 grid gap-3 text-[13px]">
          <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>مبلغ سفارش</dt><dd>{formatMoney(total, currency)}</dd></div>
          {walletApplied > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--success)]"><dt>از کیف پول</dt><dd>− {formatMoney(walletApplied, currency)}</dd></div>}
          <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base font-bold"><dt>مبلغ قابل واریز</dt><dd className="text-[var(--brand-primary)]">{formatMoney(amount, currency)}</dd></div>
        </dl>
        {expiresAt ? <div className="mt-4"><OrderExpiryCountdown expiresAt={expiresAt} warningMinutes={warningMinutes} /></div> : null}
        {canChangeMethod && <Link href="/checkout" className="mt-4 block text-center text-xs font-bold text-[var(--brand-primary)] hover:underline">انتخاب روش پرداخت دیگر</Link>}
      </Card>

      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><ListChecks size={18} /></span>
          <div className="min-w-0"><h2 className="m-0 text-base font-bold">مراحل پرداخت</h2><p className="mb-0 mt-1 text-xs leading-5 text-[var(--muted)]">چند دقیقه بیشتر زمان نمی‌برد.</p></div>
        </div>
        <ol className="m-0 mt-4 grid list-none gap-3 p-0">
          {guide.map((text, index) => (
            <li key={text} className="flex items-start gap-3 text-xs leading-6">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--brand-primary-foreground)]">{(index + 1).toLocaleString("fa-IR")}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Card>
    </aside>
  );
}
