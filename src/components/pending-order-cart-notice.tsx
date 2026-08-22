"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { ChevronLeft, Clock3, PackageCheck } from "lucide-react";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";

type Props = {
  orderId: string;
  orderNumber: string;
  total: string;
  expiresAt: string | null;
  paymentProvider: string | null;
  warningMinutes: number;
  expirationAction: "EXPIRE" | "CANCEL" | "NOTIFY";
};

export function PendingOrderCartNotice({ orderId, orderNumber, total, expiresAt, paymentProvider, warningMinutes, expirationAction }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const expirationMessage = expirationAction === "EXPIRE" ? "منقضی می‌شود" : expirationAction === "CANCEL" ? "لغو می‌شود" : "برای بررسی مدیر علامت‌گذاری می‌شود";

  // The pending order's address, coupon and pricing are already locked in, so resuming it
  // must skip straight to the gateway rather than sending the shopper through the full
  // /checkout flow again (which would only start a second, unrelated order). Reuse the
  // gateway from the order's last payment attempt; only fall back to the picker page if a
  // payment row is somehow missing.
  async function continuePayment() {
    if (isPending) return;
    if (!paymentProvider) {
      router.push(`/checkout/payment/${orderId}`);
      return;
    }
    setIsPending(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentProvider }) });
      const result = await response.json().catch(() => null) as { redirectUrl?: string; message?: string } | null;
      if (!response.ok || !result?.redirectUrl) throw new Error(result?.message ?? "شروع پرداخت انجام نشد.");
      window.location.assign(result.redirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "شروع پرداخت انجام نشد.");
      setIsPending(false);
    }
  }

  return <Card variant="secondary" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-none" dir="rtl">
    <Card.Content className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Clock3 size={22} /></span>
        <div className="min-w-0 flex-1"><strong className="flex items-center gap-2 text-sm text-amber-900"><PackageCheck size={17} />یک سفارش در انتظار پرداخت دارید</strong><p className="mb-0 mt-1 text-xs leading-6 text-amber-800">سفارش <b dir="ltr">{orderNumber}</b> به مبلغ <b>{total}</b> تا پایان مهلت پرداخت برای شما رزرو شده و سپس {expirationMessage}.</p>{expiresAt ? <OrderExpiryCountdown expiresAt={expiresAt} warningMinutes={warningMinutes} className="mt-2 bg-white/70" onExpired={() => router.refresh()} /> : <span className="mt-2 block text-[11px] text-amber-700">انقضای خودکار این سفارش غیرفعال است.</span>}</div>
        <Button type="button" variant="primary" isPending={isPending} onPress={() => void continuePayment()} className="min-h-10 shrink-0 gap-1 rounded-lg bg-[var(--brand-primary)] px-5 text-xs font-bold text-[var(--brand-primary-foreground)]">{({ isPending: loading }) => <>{loading && <Spinner color="current" size="sm" />}{loading ? "در حال انتقال..." : "پرداخت"}<ChevronLeft size={16} /></>}</Button>
      </div>
      {error ? <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert> : null}
    </Card.Content>
  </Card>;
}
