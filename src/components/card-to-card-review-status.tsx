"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@heroui/react";
import { Check, Clock, FileText, ImageIcon } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export type SubmittedProof =
  | { kind: "receipt"; url: string; name: string | null }
  | { kind: "details"; sourceCard: string; trackingCode: string };

/** How often the page re-reads the order while waiting, so an approval shows up without a manual reload. */
const REFRESH_INTERVAL_MS = 15_000;

const steps = [
  { title: "ثبت پرداخت", detail: "اطلاعات شما دریافت شد" },
  { title: "بررسی فروشگاه", detail: "در انتظار تأیید پرداخت" },
  { title: "آماده‌سازی و ارسال", detail: "پس از تأیید آغاز می‌شود" },
];

/**
 * What the customer sees once the proof is in: the payment is with the store and nothing more is
 * needed from them. The page keeps itself fresh — an approval turns the order into "paid" and the
 * server page then sends the customer on to the order.
 */
export function CardToCardReviewStatus({ orderId, submittedAt, proof }: { orderId: string; submittedAt: string; proof: SubmittedProof }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);

  return (
    <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Content className="p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <span className="relative grid size-16 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[var(--brand-primary)]/10 motion-reduce:hidden" />
            <Clock size={28} className="relative" />
          </span>
          <h2 className="mb-0 mt-4 text-lg font-bold">پرداخت شما ثبت شد</h2>
          <p className="mb-0 mt-2 max-w-md text-[13px] leading-7 text-[var(--muted)]">فروشگاه پرداخت شما را بررسی می‌کند. با تأیید آن، وضعیت سفارش به «پرداخت‌شده» تغییر می‌کند و آماده‌سازی آغاز می‌شود؛ این صفحه خودکار به‌روز می‌شود و لازم نیست پرداخت را تکرار کنید.</p>
        </div>

        <ol className="m-0 mt-6 grid list-none gap-0 p-0 sm:grid-cols-3" aria-label="مراحل پرداخت">
          {steps.map((step, index) => {
            const done = index === 0;
            const current = index === 1;
            return (
              <li key={step.title} className="relative flex items-start gap-3 pb-5 last:pb-0 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
                {index < steps.length - 1 && <span aria-hidden className={`absolute right-[15px] top-8 h-[calc(100%-2rem)] w-px sm:hidden ${done ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />}
                <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${done ? "border-[var(--success)] bg-[var(--success)] text-white" : current ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>
                  {done ? <Check size={15} strokeWidth={3} /> : (index + 1).toLocaleString("fa-IR")}
                </span>
                <span className="min-w-0 sm:mt-2">
                  <strong className={`block text-[13px] ${current ? "text-[var(--brand-primary)]" : ""}`}>{step.title}</strong>
                  <small className="mt-0.5 block text-[11px] text-[var(--muted)]">{step.detail}</small>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/45 p-4">
          <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5 font-bold text-[var(--foreground)]">{proof.kind === "receipt" ? <ImageIcon size={15} /> : <FileText size={15} />}{proof.kind === "receipt" ? "رسید ارسال‌شده" : "اطلاعات ثبت‌شده"}</span>
            <span>{formatDateTime(submittedAt)}</span>
          </div>
          {proof.kind === "receipt" ? (
            <a href={proof.url} target="_blank" rel="noopener noreferrer" aria-label="مشاهدهٔ رسید در اندازهٔ کامل" className="relative mx-auto block h-44 w-full max-w-xs overflow-hidden rounded-lg border border-[var(--border)] bg-white">
              <Image src={proof.url} alt="رسید پرداخت ارسال‌شده" fill unoptimized sizes="320px" className="object-contain p-1" />
            </a>
          ) : (
            <dl className="m-0 grid gap-2.5 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[11px] text-[var(--muted)]">شماره کارت مبدأ</dt><dd dir="ltr" className="m-0 mt-0.5 text-start font-bold tabular-nums">{proof.sourceCard}</dd></div>
              <div><dt className="text-[11px] text-[var(--muted)]">کد رهگیری</dt><dd dir="ltr" className="m-0 mt-0.5 text-start font-bold tabular-nums">{proof.trackingCode}</dd></div>
            </dl>
          )}
        </div>

        <Link href={`/account/orders/${orderId}`} className="mt-5 flex min-h-11 items-center justify-center rounded-lg border border-[var(--brand-primary)] px-5 text-sm font-bold text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)]/5">مشاهدهٔ سفارش</Link>
      </Card.Content>
    </Card>
  );
}
