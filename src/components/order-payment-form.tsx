"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { Check, ChevronRight, CreditCard, ShieldCheck } from "lucide-react";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import { formatMoney } from "@/lib/format";
import type { StorefrontPaymentMethod, StorefrontPaymentMethodId } from "@/modules/payments/storefront-methods";

export function OrderPaymentForm({ order, methods, currency, warningMinutes }: { order: { id: string; orderNumber: string; total: string; expiresAt: string | null }; methods: StorefrontPaymentMethod[]; currency: "IRR" | "IRT"; warningMinutes: number }) {
  const [selected, setSelected] = useState<StorefrontPaymentMethodId | "">(methods[0]?.id ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (!selected || isPending) return;
    setIsPending(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${order.id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentProvider: selected }) });
      const result = await response.json().catch(() => null) as { redirectUrl?: string; message?: string } | null;
      if (!response.ok || !result?.redirectUrl) throw new Error(result?.message ?? "شروع پرداخت انجام نشد.");
      window.location.assign(result.redirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "شروع پرداخت انجام نشد.");
      setIsPending(false);
    }
  }

  return <main className="bg-[var(--background)] px-4 py-10 sm:px-6" dir="rtl">
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/account/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--brand-primary)]"><ChevronRight size={17} />بازگشت به سفارش‌ها</Link>
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Content className="p-5 sm:p-7">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div><h1 className="m-0 text-xl font-bold">انتخاب درگاه پرداخت</h1><p className="mb-0 mt-2 text-sm text-[var(--muted)]">سفارش <b dir="ltr">{order.orderNumber}</b> به مبلغ <b>{formatMoney(order.total, currency)}</b></p></div>
            {order.expiresAt ? <OrderExpiryCountdown expiresAt={order.expiresAt} warningMinutes={warningMinutes} /> : null}
          </div>
          <div className="mt-5 grid gap-3">{methods.map((method) => <Button key={method.id} type="button" variant="secondary" isDisabled={isPending} onPress={() => setSelected(method.id)} className={`h-auto min-h-20 justify-start gap-3 rounded-xl border p-4 text-right ${selected === method.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><CreditCard size={22} /></span><span><strong className="block">{method.name}</strong><small className="mt-1 block font-normal text-[var(--muted)]">{method.description}</small></span>{method.sandbox ? <span className="mr-auto rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">آزمایشی</span> : null}{selected === method.id ? <Check size={18} className="text-[var(--brand-primary)]" /> : null}</Button>)}</div>
          {error ? <Alert status="danger" className="mt-5"><Alert.Description>{error}</Alert.Description></Alert> : null}
          <Button type="button" fullWidth variant="primary" isDisabled={!selected} isPending={isPending} onPress={() => void pay()} className="mt-6 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] font-bold text-[var(--brand-primary-foreground)]">{({ isPending: loading }) => <>{loading ? <Spinner color="current" size="sm" /> : <ShieldCheck size={18} />}{loading ? "در حال اتصال به درگاه..." : "پرداخت"}</>}</Button>
        </Card.Content>
      </Card>
    </div>
  </main>;
}
