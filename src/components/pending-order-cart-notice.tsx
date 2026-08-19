"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@heroui/react";
import { ChevronLeft, Clock3, PackageCheck } from "lucide-react";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";

export function PendingOrderCartNotice({ orderId, orderNumber, total, expiresAt, warningMinutes, expirationAction }: { orderId: string; orderNumber: string; total: string; expiresAt: string | null; warningMinutes: number; expirationAction: "EXPIRE" | "CANCEL" | "NOTIFY" }) {
  const router = useRouter();
  const expirationMessage = expirationAction === "EXPIRE" ? "منقضی می‌شود" : expirationAction === "CANCEL" ? "لغو می‌شود" : "برای بررسی مدیر علامت‌گذاری می‌شود";
  return <Card variant="secondary" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-none" dir="rtl">
    <Card.Content className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Clock3 size={22} /></span>
      <div className="min-w-0 flex-1"><strong className="flex items-center gap-2 text-sm text-amber-900"><PackageCheck size={17} />یک سفارش در انتظار پرداخت دارید</strong><p className="mb-0 mt-1 text-xs leading-6 text-amber-800">سفارش <b dir="ltr">{orderNumber}</b> به مبلغ <b>{total}</b> تا پایان مهلت پرداخت برای شما رزرو شده و سپس {expirationMessage}.</p>{expiresAt ? <OrderExpiryCountdown expiresAt={expiresAt} warningMinutes={warningMinutes} className="mt-2 bg-white/70" onExpired={() => router.refresh()} /> : <span className="mt-2 block text-[11px] text-amber-700">انقضای خودکار این سفارش غیرفعال است.</span>}</div>
      <Link href={`/checkout/payment/${orderId}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--brand-primary)] px-5 text-xs font-bold text-[var(--brand-primary-foreground)] transition hover:brightness-105">پرداخت<ChevronLeft size={16} /></Link>
    </Card.Content>
  </Card>;
}
