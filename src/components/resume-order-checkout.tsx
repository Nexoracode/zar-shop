"use client";

import { useState } from "react";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { Check, CreditCard, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import type { StorefrontPaymentMethod, StorefrontPaymentMethodId } from "@/modules/payments/storefront-methods";

type OrderAddress = {
  title: string;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  plaque: string;
  unit: string | null;
};

type Quote = {
  subtotal: number;
  productDiscount: number;
  promotionDiscount: number;
  shipping: number;
  shippingDiscount: number;
  total: number;
  applications: Array<{ title: string; code: string | null }>;
};

type Props = {
  orderId: string;
  orderNumber: string;
  address: OrderAddress;
  quote: Quote;
  currency: "IRR" | "IRT";
  itemCount: number;
  methods: StorefrontPaymentMethod[];
  defaultPaymentProvider: string | null;
  expiresAt: string | null;
  warningMinutes: number;
};

// A pending order's address, coupon and pricing are already locked in at creation time and
// must not change afterwards, so this only ever resumes payment for `orderId` — it never
// recomputes a quote or lets the address be edited. It intentionally mirrors CheckoutForm's
// layout (address card, payment method card, order-summary aside) so resuming an order looks
// like the same checkout page instead of a distinct flow.
export function ResumeOrderCheckout({ orderId, orderNumber, address, quote, currency, itemCount, methods, defaultPaymentProvider, expiresAt, warningMinutes }: Props) {
  const [paymentProvider, setPaymentProvider] = useState<StorefrontPaymentMethodId | "">((defaultPaymentProvider as StorefrontPaymentMethodId | null) ?? methods[0]?.id ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (!paymentProvider || isPending) return;
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

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]" dir="rtl">
      <div className="grid gap-5">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><MapPin size={20} /></span><div><h2 className="m-0 text-base font-bold">نشانی تحویل سفارش</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">این نشانی هنگام ثبت سفارش شما ذخیره شده و قابل تغییر نیست.</p></div></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]/45 p-4">
              <strong className="text-sm">{address.title}</strong>
              <p className="mb-0 mt-3 text-sm leading-7">{address.province}، {address.city}، {address.addressLine}، پلاک {address.plaque}{address.unit ? `، واحد ${address.unit}` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]"><span>کد پستی: <b dir="ltr">{address.postalCode}</b></span><span>تحویل‌گیرنده: <b>{address.recipient}</b></span><span dir="ltr">{address.phone}</span></div>
            </div>
          </Card.Content>
        </Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><CreditCard size={20} /></span><div><h2 className="m-0 text-base font-bold">روش پرداخت</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">پرداخت از طریق درگاه امن بانکی انجام می‌شود.</p></div></div>
            {methods.length ? <div className="grid gap-3">{methods.map((method) => <Button key={method.id} type="button" variant="secondary" isDisabled={isPending} onPress={() => setPaymentProvider(method.id)} className={`h-auto min-h-20 justify-start gap-3 rounded-xl border p-4 text-right ${paymentProvider === method.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><CreditCard size={22} /></span><span><strong className="block">{method.name}</strong><small className="mt-1 block font-normal text-[var(--muted)]">{method.description}</small></span>{method.sandbox && <span className="mr-auto rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">آزمایشی</span>}{paymentProvider === method.id && <Check size={18} className="text-[var(--brand-primary)]" />}</Button>)}</div> : <Alert status="warning"><Alert.Description>هنوز هیچ درگاه پرداختی برای فروشگاه پیکربندی نشده است.</Alert.Description></Alert>}
          </Card.Content>
        </Card>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><strong className="text-base font-bold">خلاصه سفارش</strong><span className="text-xs text-[var(--muted)]">{itemCount.toLocaleString("fa-IR")} کالا</span></div>
          <p className="mb-4 mt-0 text-xs text-[var(--muted)]">سفارش <b dir="ltr">{orderNumber}</b></p>
          <dl className="m-0 grid gap-4 text-sm">
            <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها</dt><dd>{formatMoney(quote.subtotal, currency)}</dd></div>
            {quote.productDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--danger)]"><dt>تخفیف کالاها</dt><dd>{formatMoney(quote.productDiscount, currency)}</dd></div>}
            {quote.promotionDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>کد تخفیف</dt><dd>{formatMoney(quote.promotionDiscount, currency)}</dd></div>}
            <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>هزینه ارسال</dt><dd>{quote.shipping === 0 ? "رایگان" : formatMoney(quote.shipping, currency)}</dd></div>
            {quote.shippingDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>تخفیف ارسال</dt><dd>{formatMoney(quote.shippingDiscount, currency)}</dd></div>}
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base font-bold"><dt>مبلغ قابل پرداخت</dt><dd>{formatMoney(quote.total, currency)}</dd></div>
          </dl>
          {quote.applications.length > 0 && <div className="mt-4 grid gap-2">{quote.applications.map((application) => <div key={`${application.title}-${application.code ?? "auto"}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><strong>{application.title}</strong>{application.code && <span className="mr-2" dir="ltr">{application.code}</span>}</div>)}</div>}
          {expiresAt ? <div className="mt-4"><OrderExpiryCountdown expiresAt={expiresAt} warningMinutes={warningMinutes} /></div> : null}
          {error ? <Alert status="danger" className="mt-4"><Alert.Description>{error}</Alert.Description></Alert> : null}
          <Button type="button" fullWidth variant="primary" isPending={isPending} isDisabled={!paymentProvider} onPress={() => void pay()} className="mt-5 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">{({ isPending: loading }) => <>{loading && <Spinner color="current" size="sm" />}{loading ? "در حال انتقال به درگاه..." : "پرداخت سفارش"}</>}</Button>
        </Card>
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2 font-bold text-[var(--foreground)]"><PackageCheck size={17} />سفارش شما محفوظ است</span><p className="mb-0 mt-2 leading-6">این سفارش قبلاً ثبت شده؛ فقط کافی است پرداخت را تکمیل کنید.</p></Card>
        <div className="flex items-start gap-2 px-2 text-[11px] leading-6 text-[var(--muted)]"><ShieldCheck size={16} className="mt-1 shrink-0" />پرداخت امن و حفاظت از اطلاعات خرید</div>
      </aside>
    </div>
  );
}
