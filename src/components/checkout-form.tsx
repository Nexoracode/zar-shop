"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Spinner, toast } from "@heroui/react";
import { BadgePercent, Check, ChevronLeft, CreditCard, MapPin, PackageCheck, ShieldCheck, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { CommerceSettings } from "@/modules/settings/commerce-settings";
import type { StorefrontPaymentMethod } from "@/modules/payments/storefront-methods";
import { ADDRESS_UPDATED_EVENT, DeliveryAddressPicker } from "@/components/delivery-address-picker";
import type { StorefrontAddress } from "@/components/address-form";
import { notifyCartUpdated } from "@/components/storefront-cart-link";
import { promotionFieldLimits } from "@/modules/promotions/schemas";
import { TextField } from "@/components/form-field";
import { ShippingMethodPicker } from "@/components/shipping-method-picker";

type Quote = { subtotal: number; productDiscount: number; merchandiseAmount: number; promotionDiscount: number; shipping: number; shippingDiscount: number; total: number; applications: Array<{ title: string; code: string | null; discountAmount: number; shippingDiscount: number }> };

export function CheckoutForm({ settings, paymentMethods, currency, itemCount, initialQuote, initialAddresses, user }: { settings: CommerceSettings; paymentMethods: StorefrontPaymentMethod[]; currency: "IRR" | "IRT"; itemCount: number; initialQuote: Quote; initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null } }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentProvider, setPaymentProvider] = useState(paymentMethods[0]?.id ?? "");
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState(initialQuote);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<StorefrontAddress | null>(initialAddresses.find((item) => item.isDefault) ?? initialAddresses[0] ?? null);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: StorefrontAddress; deletedId?: string; fallback?: StorefrontAddress }>).detail;
      if (detail.deletedId) setSelectedAddress((current) => current?.id === detail.deletedId ? detail.fallback ?? null : current);
      if (detail.address) setSelectedAddress((current) => detail.address!.isDefault || current?.id === detail.address!.id || !current ? detail.address! : current);
    };
    window.addEventListener(ADDRESS_UPDATED_EVENT, update);
    return () => window.removeEventListener(ADDRESS_UPDATED_EVENT, update);
  }, []);

  async function refreshQuote(nextCoupon = couponCode, nextMethodId = shippingMethodId) {
    setCheckingCoupon(true); setCouponError(""); setCouponMessage("");
    if (!selectedAddress) { setCouponError("ابتدا نشانی تحویل را ثبت و انتخاب کنید."); setCheckingCoupon(false); return; }
    try {
      const response = await fetch("/api/checkout/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: nextCoupon, addressId: selectedAddress.id, shippingMethodId: nextMethodId }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "بررسی تخفیف انجام نشد.");
      setQuote(result as Quote);
      setCouponMessage(nextCoupon.trim() ? "کد تخفیف با موفقیت اعمال شد." : "");
    } catch (reason) {
      setCouponError(reason instanceof Error ? reason.message : "بررسی تخفیف انجام نشد.");
    } finally { setCheckingCoupon(false); }
  }

  function clearCoupon() {
    setCouponCode("");
    setCouponMessage("");
    setCouponError("");
    void refreshQuote("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    if (!selectedAddress) { setError("برای ثبت سفارش ابتدا نشانی تحویل را اضافه و انتخاب کنید."); setLoading(false); return; }
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.message ?? "ثبت سفارش ناموفق بود."); setLoading(false); return; }
    notifyCartUpdated(0);
    toast.success("سفارش با موفقیت ثبت شد", { description: "در حال انتقال امن به درگاه پرداخت هستید.", timeout: 4000 });
    window.setTimeout(() => window.location.assign(data.redirectUrl), 400);
  }

  const couponHasResult = Boolean(couponCode && (couponMessage || couponError));

  return (
    <form ref={formRef} onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]" dir="rtl">
      <div className="grid gap-5">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5 sm:p-6">
            <input type="hidden" name="addressId" value={selectedAddress?.id ?? ""} />
            <div className="mb-5 flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><MapPin size={20} /></span><div><h2 className="m-0 text-base font-bold">نشانی تحویل سفارش</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">نشانی ارسال را پیش از پرداخت بررسی کنید.</p></div></div><DeliveryAddressPicker initialAddresses={initialAddresses} user={user} /></div>
            {selectedAddress ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]/45 p-4"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{selectedAddress.title}</strong>{selectedAddress.isDefault && <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary-foreground)]">پیش‌فرض</span>}</div><p className="mb-0 mt-3 text-sm leading-7">{selectedAddress.province}، {selectedAddress.city}، {selectedAddress.addressLine}، پلاک {selectedAddress.plaque}{selectedAddress.unit ? `، واحد ${selectedAddress.unit}` : ""}</p><div className="mt-3 text-xs text-[var(--muted)]">کد پستی: <b dir="ltr">{selectedAddress.postalCode}</b></div></div> : <Alert status="warning"><Alert.Description>برای ادامه، اولین نشانی تحویل خود را ثبت کنید.</Alert.Description></Alert>}
          </Card.Content>
        </Card>

        <ShippingMethodPicker
          addressId={selectedAddress?.id ?? null}
          currency={currency}
          selectedMethodId={shippingMethodId}
          onSelect={(methodId) => { setShippingMethodId(methodId); void refreshQuote(couponCode, methodId); }}
        />

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><CreditCard size={20} /></span><div><h2 className="m-0 text-base font-bold">روش پرداخت</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">پرداخت از طریق درگاه امن بانکی انجام می‌شود.</p></div></div><input type="hidden" name="paymentProvider" value={paymentProvider} />{paymentMethods.length ? <div className="grid gap-3">{paymentMethods.map((method) => <Button key={method.id} type="button" variant="secondary" onPress={() => setPaymentProvider(method.id)} className={`h-auto min-h-20 justify-start gap-3 rounded-xl border p-4 text-right ${paymentProvider === method.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)]"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><CreditCard size={22} /></span><span><strong className="block">{method.name}</strong><small className="mt-1 block font-normal text-[var(--muted)]">{method.description}</small></span>{method.sandbox && <span className="mr-auto rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">آزمایشی</span>}{paymentProvider === method.id && <Check size={18} className="text-[var(--brand-primary)]" />}</Button>)}</div> : <Alert status="warning"><Alert.Description>هنوز هیچ درگاه پرداختی برای فروشگاه پیکربندی نشده است.</Alert.Description></Alert>}</Card.Content></Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Card.Content className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><BadgePercent size={19} className="text-[var(--brand-primary)]" /><h2 className="m-0 text-base font-bold">کد تخفیف</h2></div><div className="relative w-full sm:w-[46%]"><TextField name="couponCode" aria-label="کد تخفیف" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponMessage(""); setCouponError(""); }} dir="rtl" maxLength={promotionFieldLimits.code} reserveMessage={false} controlClassName="pl-24 text-right uppercase placeholder:text-right" placeholder="کد تخفیف را وارد کنید" />{couponHasResult ? <Button type="button" isIconOnly variant="ghost" isDisabled={checkingCoupon} aria-label="حذف کد تخفیف" onPress={clearCoupon} className="absolute left-2 top-1/2 z-10 size-8 min-h-8 min-w-8 -translate-y-1/2 bg-transparent text-[var(--muted)] hover:bg-transparent hover:text-[var(--danger)] data-[hovered=true]:bg-transparent"><X size={15} /></Button> : <Button type="button" variant="ghost" isPending={checkingCoupon} isDisabled={!couponCode.trim()} onPress={() => void refreshQuote()} className="absolute left-2 top-1/2 z-10 h-8 min-h-8 -translate-y-1/2 bg-transparent px-2 text-sm font-medium text-[var(--brand-primary)] hover:bg-transparent data-[disabled=true]:cursor-not-allowed data-[hovered=true]:bg-transparent">بررسی</Button>}</div>{couponMessage && <p className="mb-0 mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700"><Check size={15} />{couponMessage}</p>}{couponError && <p className="mb-0 mt-3 text-xs font-bold text-[var(--danger)]">{couponError}</p>}<p className="mb-0 mt-3 text-[11px] leading-6 text-[var(--muted)]">کد تخفیف هنگام ثبت نهایی سفارش دوباره در سرور اعتبارسنجی می‌شود.</p></Card.Content></Card>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><strong className="text-base font-bold">خلاصه سفارش</strong><span className="text-xs text-[var(--muted)]">{itemCount.toLocaleString("fa-IR")} کالا</span></div><dl className="m-0 grid gap-4 text-sm"><div className="flex justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها</dt><dd>{formatMoney(quote.subtotal, currency)}</dd></div>{quote.productDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--danger)]"><dt>تخفیف کالاها</dt><dd>{formatMoney(quote.productDiscount, currency)}</dd></div>}{quote.promotionDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>کد تخفیف</dt><dd>{formatMoney(quote.promotionDiscount, currency)}</dd></div>}<div className="flex justify-between gap-4 text-[var(--muted)]"><dt>هزینه ارسال</dt><dd>{quote.shipping === 0 ? "رایگان" : formatMoney(quote.shipping, currency)}</dd></div>{quote.shippingDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-emerald-700"><dt>تخفیف ارسال</dt><dd>{formatMoney(quote.shippingDiscount, currency)}</dd></div>}<div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base font-bold"><dt>مبلغ قابل پرداخت</dt><dd>{formatMoney(quote.total, currency)}</dd></div></dl>{quote.applications.length > 0 && <div className="mt-4 grid gap-2">{quote.applications.map((application) => <div key={`${application.title}-${application.code ?? "auto"}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><strong>{application.title}</strong>{application.code && <span className="mr-2" dir="ltr">{application.code}</span>}</div>)}</div>}{error && <Alert status="danger" className="mt-4"><Alert.Description>{error}</Alert.Description></Alert>}{!settings.onlinePaymentEnabled && <Alert status="warning" className="mt-4"><Alert.Description>پرداخت آنلاین موقتاً غیرفعال است.</Alert.Description></Alert>}<Button type="submit" fullWidth variant="primary" isPending={loading} isDisabled={!settings.onlinePaymentEnabled || !paymentProvider || checkingCoupon || !selectedAddress} className="mt-5 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">{({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ثبت سفارش..." : "ثبت سفارش و پرداخت"}<ChevronLeft size={18} /></>}</Button><div className="mt-4 flex items-start gap-2 text-[11px] leading-6 text-[var(--muted)]"><ShieldCheck size={16} className="mt-1 shrink-0" />با ثبت سفارش، اطلاعات و مبلغ نهایی در سمت سرور کنترل و سپس به درگاه منتقل می‌شود.</div></Card>
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-2 font-bold text-[var(--foreground)]"><PackageCheck size={17} />سفارش شما محفوظ است</span><p className="mb-0 mt-2 leading-6">موجودی پس از ثبت سفارش تا پایان مهلت پرداخت برای شما رزرو می‌شود.</p></Card>
      </aside>
    </form>
  );
}
