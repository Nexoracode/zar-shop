"use client";

import { useRef, useState } from "react";
import { Alert, Button, Card, Input, Spinner, TextArea, toast } from "@heroui/react";
import { BadgePercent, Building2, Check, ChevronLeft, CreditCard, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { CommerceSettings } from "@/modules/settings/commerce-settings";
import type { StorefrontPaymentMethod } from "@/modules/payments/storefront-methods";

type Address = { recipient?: string; phone?: string; province?: string; city?: string; postalCode?: string; addressLine?: string };
type Quote = { subtotal: number; productDiscount: number; merchandiseAmount: number; promotionDiscount: number; shipping: number; shippingDiscount: number; total: number; applications: Array<{ title: string; code: string | null; discountAmount: number; shippingDiscount: number }> };

export function CheckoutForm({ settings, paymentMethods, currency, itemCount, initialQuote, initialAddress }: { settings: CommerceSettings; paymentMethods: StorefrontPaymentMethod[]; currency: "IRR" | "IRT"; itemCount: number; initialQuote: Quote; initialAddress?: Address | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const defaultDelivery = settings.insuredShippingEnabled ? "INSURED_SHIPPING" : "STORE_PICKUP";
  const [deliveryMethod, setDeliveryMethod] = useState<"INSURED_SHIPPING" | "STORE_PICKUP">(defaultDelivery);
  const [paymentProvider, setPaymentProvider] = useState(paymentMethods[0]?.id ?? "");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState(initialQuote);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshQuote(nextDelivery = deliveryMethod, nextCoupon = couponCode) {
    setCheckingCoupon(true); setCouponError(""); setCouponMessage("");
    const form = formRef.current;
    const city = form ? String(new FormData(form).get("city") ?? "") : "";
    try {
      const response = await fetch("/api/checkout/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: nextCoupon, city, deliveryMethod: nextDelivery }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بررسی تخفیف انجام نشد.");
      setQuote(result as Quote);
      setCouponMessage(nextCoupon.trim() ? "کد تخفیف با موفقیت اعمال شد." : "مبلغ سفارش به‌روزرسانی شد.");
    } catch (reason) {
      setCouponError(reason instanceof Error ? reason.message : "بررسی تخفیف انجام نشد.");
    } finally { setCheckingCoupon(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.message ?? "ثبت سفارش ناموفق بود."); setLoading(false); return; }
    toast.success("سفارش با موفقیت ثبت شد", { description: "در حال انتقال امن به درگاه پرداخت هستید.", timeout: 4000 });
    window.setTimeout(() => window.location.assign(data.redirectUrl), 400);
  }

  const fieldClass = "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
  const labelClass = "grid gap-2 text-xs font-bold text-[var(--foreground)]";

  return (
    <form ref={formRef} onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]" dir="rtl">
      <div className="grid gap-5">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><MapPin size={20} /></span><div><h2 className="m-0 text-base font-black">نشانی و مشخصات تحویل</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">اطلاعات تحویل‌گیرنده را دقیق وارد کنید.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>نام تحویل‌گیرنده<Input name="recipient" defaultValue={initialAddress?.recipient ?? ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>شماره تماس<Input name="phone" defaultValue={initialAddress?.phone ?? ""} dir="ltr" inputMode="tel" pattern="09[0-9]{9}" required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>استان<Input name="province" defaultValue={initialAddress?.province ?? ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>شهر<Input name="city" defaultValue={initialAddress?.city ?? ""} required fullWidth variant="secondary" className={fieldClass} /></label><label className={labelClass}>کد پستی<Input name="postalCode" defaultValue={initialAddress?.postalCode ?? ""} dir="ltr" inputMode="numeric" required fullWidth variant="secondary" className={fieldClass} /></label><label className={`${labelClass} sm:col-span-2`}>نشانی کامل<TextArea name="addressLine" defaultValue={initialAddress?.addressLine ?? ""} rows={3} required fullWidth variant="secondary" className={fieldClass} /></label></div>
          </Card.Content>
        </Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Truck size={20} /></span><div><h2 className="m-0 text-base font-black">شیوه تحویل</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">روش مناسب دریافت سفارش را انتخاب کنید.</p></div></div><input type="hidden" name="deliveryMethod" value={deliveryMethod} /><div className="grid gap-3 sm:grid-cols-2">{settings.insuredShippingEnabled && <Button type="button" variant="secondary" onPress={() => { setDeliveryMethod("INSURED_SHIPPING"); void refreshQuote("INSURED_SHIPPING"); }} className={`h-auto min-h-24 justify-start gap-3 rounded-xl border p-4 text-right ${deliveryMethod === "INSURED_SHIPPING" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><Truck size={22} /><span><strong className="block">ارسال بیمه‌شده</strong><small className="mt-1 block font-normal text-[var(--muted)]">ارسال امن و قابل رهگیری</small></span>{deliveryMethod === "INSURED_SHIPPING" && <Check size={18} className="mr-auto text-[var(--brand-primary)]" />}</Button>}{settings.inStorePickupEnabled && <Button type="button" variant="secondary" onPress={() => { setDeliveryMethod("STORE_PICKUP"); void refreshQuote("STORE_PICKUP"); }} className={`h-auto min-h-24 justify-start gap-3 rounded-xl border p-4 text-right ${deliveryMethod === "STORE_PICKUP" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><Building2 size={22} /><span><strong className="block">تحویل حضوری</strong><small className="mt-1 block font-normal text-[var(--muted)]">دریافت مستقیم از فروشگاه</small></span>{deliveryMethod === "STORE_PICKUP" && <Check size={18} className="mr-auto text-[var(--brand-primary)]" />}</Button>}</div></Card.Content></Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><CreditCard size={20} /></span><div><h2 className="m-0 text-base font-black">روش پرداخت</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">پرداخت از طریق درگاه امن بانکی انجام می‌شود.</p></div></div><input type="hidden" name="paymentProvider" value={paymentProvider} /><div className="grid gap-3">{paymentMethods.map((method) => <Button key={method.id} type="button" variant="secondary" onPress={() => setPaymentProvider(method.id)} className={`h-auto min-h-20 justify-start gap-3 rounded-xl border p-4 text-right ${paymentProvider === method.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><CreditCard size={22} /></span><span><strong className="block">{method.name}</strong><small className="mt-1 block font-normal text-[var(--muted)]">{method.description}</small></span>{method.sandbox && <span className="mr-auto rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">آزمایشی</span>}{paymentProvider === method.id && <Check size={18} className="text-[var(--brand-primary)]" />}</Button>)}</div></Card.Content></Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><BadgePercent size={19} className="text-[var(--brand-primary)]" /><h2 className="m-0 text-base font-black">کد تخفیف</h2></div><div className="flex gap-2"><Input name="couponCode" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponMessage(""); setCouponError(""); }} dir="ltr" fullWidth variant="secondary" className={`${fieldClass} uppercase`} placeholder="کد تخفیف را وارد کنید" /><Button type="button" variant="secondary" isPending={checkingCoupon} onPress={() => void refreshQuote()} className="min-h-12 shrink-0 border border-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary)]">بررسی کد</Button></div>{couponMessage && <p className="mb-0 mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700"><Check size={15} />{couponMessage}</p>}{couponError && <p className="mb-0 mt-3 text-xs font-bold text-[var(--danger)]">{couponError}</p>}<p className="mb-0 mt-3 text-[11px] leading-6 text-[var(--muted)]">کد تخفیف هنگام ثبت نهایی سفارش دوباره در سرور اعتبارسنجی می‌شود.</p></Card.Content></Card>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><strong className="text-base font-black">خلاصه سفارش</strong><span className="text-xs text-[var(--muted)]">{itemCount.toLocaleString("fa-IR")} کالا</span></div><dl className="m-0 grid gap-4 text-sm"><div className="flex justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها</dt><dd>{formatMoney(quote.subtotal, currency)}</dd></div>{quote.productDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--danger)]"><dt>تخفیف کالاها</dt><dd>{formatMoney(quote.productDiscount, currency)}</dd></div>}{quote.promotionDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>کد تخفیف</dt><dd>{formatMoney(quote.promotionDiscount, currency)}</dd></div>}<div className="flex justify-between gap-4 text-[var(--muted)]"><dt>هزینه ارسال</dt><dd>{quote.shipping === 0 ? "رایگان" : formatMoney(quote.shipping, currency)}</dd></div>{quote.shippingDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>تخفیف ارسال</dt><dd>{formatMoney(quote.shippingDiscount, currency)}</dd></div>}<div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base font-black"><dt>مبلغ قابل پرداخت</dt><dd>{formatMoney(quote.total, currency)}</dd></div></dl>{quote.applications.length > 0 && <div className="mt-4 grid gap-2">{quote.applications.map((application) => <div key={`${application.title}-${application.code ?? "auto"}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><strong>{application.title}</strong>{application.code && <span className="mr-2" dir="ltr">{application.code}</span>}</div>)}</div>}{error && <Alert status="danger" className="mt-4"><Alert.Description>{error}</Alert.Description></Alert>}{!settings.onlinePaymentEnabled && <Alert status="warning" className="mt-4"><Alert.Description>پرداخت آنلاین موقتاً غیرفعال است.</Alert.Description></Alert>}<Button type="submit" fullWidth variant="primary" isPending={loading} isDisabled={!settings.onlinePaymentEnabled || !paymentProvider || checkingCoupon} className="mt-5 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-black text-[var(--brand-primary-foreground)]">{({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ثبت سفارش..." : "ثبت سفارش و پرداخت"}<ChevronLeft size={18} /></>}</Button><div className="mt-4 flex items-start gap-2 text-[11px] leading-6 text-[var(--muted)]"><ShieldCheck size={16} className="mt-1 shrink-0" />با ثبت سفارش، اطلاعات و مبلغ نهایی در سمت سرور کنترل و سپس به درگاه منتقل می‌شود.</div></Card>
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2 font-bold text-[var(--foreground)]"><PackageCheck size={17} />سفارش شما محفوظ است</span><p className="mb-0 mt-2 leading-6">موجودی پس از ثبت سفارش تا پایان مهلت پرداخت برای شما رزرو می‌شود.</p></Card>
      </aside>
    </form>
  );
}
