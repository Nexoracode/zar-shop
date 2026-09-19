"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { Card } from "@heroui/react";
import { CopyButton } from "@/components/copy-button";
import { formatMoney } from "@/lib/format";
import { formatCardNumber, formatSheba } from "@/modules/account/bank-card";
import type { CardToCardDestination as Destination } from "@/modules/settings/card-to-card-settings";

/**
 * The top of the transfer page: whose card the money goes to. The card is drawn in the brand's
 * primary colour (the same CSS variable the rest of the storefront takes it from), so it changes
 * with the store's «ظاهر و برند» settings instead of carrying a fixed palette.
 */
export function CardToCardDestination({ destination, amount, currency }: { destination: Destination; amount: number; currency: "IRR" | "IRT" }) {
  // What to paste into a banking app: the amount in the unit the store shows, digits only.
  const amountDigits = String(Math.round(currency === "IRT" ? amount / 10 : amount));
  return (
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Landmark size={18} /></span>
          <div>
            <h2 className="m-0 text-base font-bold">اطلاعات کارت مقصد</h2>
            <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)]">مبلغ سفارش را به کارت زیر واریز کنید؛ پیش از تأیید بانک، نام صاحب کارت را با اطلاعات زیر مطابقت دهید.</p>
          </div>
        </div>

        <div
          className="relative isolate overflow-hidden rounded-2xl p-5 text-[var(--brand-primary-foreground)] shadow-md sm:p-6"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 66%, black) 100%)" }}
        >
          <span aria-hidden className="pointer-events-none absolute -left-12 -top-14 -z-10 size-48 rounded-full bg-white/10" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 right-6 -z-10 size-56 rounded-full bg-white/[0.07]" />
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold"><Landmark size={18} className="shrink-0" /><span className="truncate">{destination.bankName ?? "کارت بانکی فروشگاه"}</span></span>
            <span aria-hidden className="h-7 w-9 shrink-0 rounded-md bg-white/30 ring-1 ring-inset ring-white/40" />
          </div>
          <div className="mt-7 flex items-center justify-between gap-2">
            <span dir="ltr" className="min-w-0 truncate font-mono text-[19px] font-bold tabular-nums tracking-[0.1em] sm:text-2xl">{formatCardNumber(destination.cardNumber)}</span>
            <CopyButton value={destination.cardNumber} label="شماره کارت" className="text-[var(--brand-primary-foreground)] hover:bg-white/15" />
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[10px] opacity-80">صاحب کارت</span>
              <strong className="mt-0.5 block truncate text-sm">{destination.holderName}</strong>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold"><ShieldCheck size={13} />کارت رسمی فروشگاه</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 px-4 py-3.5">
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--muted)]">مبلغ قابل واریز</span>
              <strong className="mt-0.5 block text-lg tabular-nums text-[var(--brand-primary)]">{formatMoney(amount, currency)}</strong>
              <span className="mt-0.5 block text-[11px] text-[var(--muted)]">دقیقاً همین مبلغ را واریز کنید.</span>
            </div>
            <CopyButton value={amountDigits} label="مبلغ" className="text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10" />
          </div>
          {destination.sheba && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <span className="block text-[11px] text-[var(--muted)]">شماره شبا</span>
                <strong dir="ltr" className="mt-0.5 block truncate text-start font-mono text-[13px] tabular-nums">{formatSheba(destination.sheba)}</strong>
              </div>
              <CopyButton value={`IR${destination.sheba}`} label="شماره شبا" className="text-[var(--muted)] hover:text-[var(--brand-primary)]" />
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
