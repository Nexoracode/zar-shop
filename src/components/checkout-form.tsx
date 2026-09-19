"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Spinner, toast } from "@heroui/react";
import { ArrowLeftRight, BadgePercent, Check, ChevronLeft, CreditCard, MapPin, PartyPopper, Ticket, Wallet, X } from "lucide-react";
import { InlineAlert } from "@/components/inline-alert";
import { formatMoney } from "@/lib/format";
import type { CommerceSettings } from "@/modules/settings/commerce-settings";
import { CARD_TO_CARD_PROVIDER } from "@/modules/payments/card-to-card-shared";
import type { CheckoutPaymentMethod } from "@/modules/payments/storefront-methods";
import { ADDRESS_UPDATED_EVENT, DeliveryAddressPicker } from "@/components/delivery-address-picker";
import type { StorefrontAddress } from "@/components/address-form";
import { notifyCartUpdated } from "@/components/storefront-cart-link";
import { promotionFieldLimits } from "@/modules/promotions/schemas";
import { TextField } from "@/components/form-field";
import { CheckoutItems, type CheckoutItem } from "@/components/checkout-items";

type Quote = { subtotal: number; productDiscount: number; merchandiseAmount: number; promotionDiscount: number; shipping: number; shippingDiscount: number; total: number; walletBalance: number; walletApplied: number; payable: number; applications: Array<{ title: string; code: string | null; discountAmount: number; shippingDiscount: number }> };

/** Shared look for a selectable payment row — a gateway option or the wallet toggle. */
const optionClass = (selected: boolean) =>
  `h-auto min-h-0 w-full items-center justify-start gap-2.5 rounded-lg border px-3 py-2.5 text-right ${selected ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--border)]"}`;

export function CheckoutForm({ settings, paymentMethods, currency, itemCount, items, initialQuote, initialAddresses, user, wallet }: { settings: CommerceSettings; paymentMethods: CheckoutPaymentMethod[]; currency: "IRR" | "IRT"; itemCount: number; items: CheckoutItem[]; initialQuote: Quote; initialAddresses: StorefrontAddress[]; user: { firstName: string | null; lastName: string | null; phone: string | null }; wallet: { balance: number; checkoutEnabled: boolean } }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentProvider, setPaymentProvider] = useState<string>(paymentMethods[0]?.id ?? "");
  // A card-to-card transfer is settled by an admin, so the "online payment" switch (bank gateways) does not apply to it.
  const cardToCardSelected = paymentProvider === CARD_TO_CARD_PROVIDER;
  const [couponCode, setCouponCode] = useState("");
  const walletAvailable = wallet.checkoutEnabled && wallet.balance > 0;
  const [useWallet, setUseWallet] = useState(walletAvailable);
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

  // Shipping is worked out by the server from the address, so the total follows whichever one is chosen —
  // including the first, which the server page could only price with the flat fee.
  const selectedAddressId = selectedAddress?.id ?? null;
  useEffect(() => {
    if (selectedAddressId) void refreshQuote();
    // Only the address should trigger this; the coupon and wallet choices refresh on their own actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId]);

  async function refreshQuote(nextCoupon = couponCode, nextUseWallet = useWallet) {
    setCheckingCoupon(true); setCouponError(""); setCouponMessage("");
    if (!selectedAddress) { setCouponError("ابتدا نشانی تحویل را ثبت و انتخاب کنید."); setCheckingCoupon(false); return; }
    try {
      const response = await fetch("/api/checkout/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponCode: nextCoupon, addressId: selectedAddress.id, useWallet: nextUseWallet }) });
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
    const body = { addressId: selectedAddress.id, paymentProvider, couponCode, useWallet };
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.message ?? "ثبت سفارش ناموفق بود."); setLoading(false); return; }
    notifyCartUpdated(0);
    const paidFully = quote.payable <= 0;
    toast.success("سفارش با موفقیت ثبت شد", { description: paidFully ? "در حال انتقال به صفحهٔ فاکتور هستید." : cardToCardSelected ? "در حال انتقال به صفحهٔ کارت‌به‌کارت هستید." : "در حال انتقال امن به درگاه پرداخت هستید.", timeout: 4000 });
    window.setTimeout(() => window.location.assign(data.redirectUrl), 400);
  }

  // Applied once the server accepted the code; typing again (which clears the message) reopens the field.
  const couponApplied = Boolean(couponCode.trim() && couponMessage && !couponError);

  return (
    <form ref={formRef} onSubmit={submit} className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]" dir="rtl">
      <div className="grid min-w-0 gap-5">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5">
            <input type="hidden" name="addressId" value={selectedAddress?.id ?? ""} />
            <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><MapPin size={18} /></span><div className="min-w-0"><h2 className="m-0 text-base font-bold">نشانی تحویل سفارش</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">نشانی ارسال را پیش از پرداخت بررسی کنید.</p></div></div><DeliveryAddressPicker initialAddresses={initialAddresses} user={user} /></div>
            {selectedAddress ? <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/45 px-3 py-2.5"><div className="flex flex-wrap items-center gap-2"><strong className="text-[13px]">{selectedAddress.title}</strong>{selectedAddress.isDefault && <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary-foreground)]">پیش‌فرض</span>}</div><p className="mb-0 mt-1.5 text-[13px] leading-6">{selectedAddress.province}، {selectedAddress.city}، {selectedAddress.addressLine}، پلاک {selectedAddress.plaque}{selectedAddress.unit ? `، واحد ${selectedAddress.unit}` : ""}</p><div className="mt-1.5 text-[11px] text-[var(--muted)]">کد پستی: <b dir="ltr">{selectedAddress.postalCode}</b></div></div> : <InlineAlert status="warning">برای ادامه، اولین نشانی تحویل خود را ثبت کنید.</InlineAlert>}
          </Card.Content>
        </Card>

        <CheckoutItems items={items} currency={currency} editHref="/cart" />

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><CreditCard size={18} /></span>
              <div>
                <h2 className="m-0 text-base font-bold">روش پرداخت</h2>
                <p className="mb-0 mt-1 text-xs text-[var(--muted)]">{walletAvailable ? "می‌توانید بخشی یا همهٔ مبلغ را با کیف پول بپردازید؛ باقی‌مانده از درگاه امن بانکی پرداخت می‌شود." : "پرداخت از طریق درگاه امن بانکی انجام می‌شود."}</p>
              </div>
            </div>
            <input type="hidden" name="paymentProvider" value={paymentProvider} />

            <div className="grid gap-2">
              {walletAvailable && (
                <Button
                  type="button"
                  variant="secondary"
                  onPress={() => { const next = !useWallet; setUseWallet(next); void refreshQuote(couponCode, next); }}
                  className={optionClass(useWallet)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-secondary)] text-[var(--brand-primary)]"><Wallet size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block whitespace-normal text-[13px]">اعتبار کیف پول</strong>
                    <small className="mt-0.5 block whitespace-normal text-[11px] font-normal text-[var(--muted)]">موجودی: {formatMoney(wallet.balance, currency)}{useWallet && quote.walletApplied > 0 ? ` · ${formatMoney(quote.walletApplied, currency)} کسر می‌شود` : ""}</small>
                  </span>
                  {useWallet && <Check size={16} className="shrink-0 text-[var(--brand-primary)]" />}
                </Button>
              )}

              {quote.payable <= 0 && walletAvailable && useWallet ? (
                <p className="m-0 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/45 px-3 py-2.5 text-[11px] font-bold text-[var(--success)]">
                  <Check size={15} className="shrink-0" />کل مبلغ این سفارش از اعتبار کیف پول پرداخت می‌شود و نیازی به درگاه بانکی نیست.
                </p>
              ) : paymentMethods.length ? (
                <>
                  {walletAvailable && useWallet && quote.walletApplied > 0 && (
                    <p className="m-0 px-1 pt-1 text-[11px] font-bold text-[var(--muted)]">باقی‌ماندهٔ مبلغ ({formatMoney(quote.payable, currency)}) از این درگاه پرداخت می‌شود:</p>
                  )}
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.id}
                      type="button"
                      variant="secondary"
                      onPress={() => setPaymentProvider(method.id)}
                      className={optionClass(paymentProvider === method.id)}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-secondary)] text-[var(--brand-primary)]">{method.id === CARD_TO_CARD_PROVIDER ? <ArrowLeftRight size={17} /> : <CreditCard size={17} />}</span>
                      <span className="min-w-0 flex-1"><strong className="block whitespace-normal text-[13px]">{method.name}</strong><small className="mt-0.5 block whitespace-normal text-[11px] font-normal text-[var(--muted)]">{method.description}</small></span>
                      {method.sandbox && <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning)]">آزمایشی</span>}
                      {paymentProvider === method.id && <Check size={16} className="shrink-0 text-[var(--brand-primary)]" />}
                    </Button>
                  ))}
                </>
              ) : (
                <InlineAlert status="warning">هنوز هیچ درگاه پرداختی برای فروشگاه پیکربندی نشده است.</InlineAlert>
              )}
            </div>
          </Card.Content>
        </Card>

      </div>

      <aside className="grid min-w-0 gap-5 lg:sticky lg:top-24">
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><strong className="text-base font-bold">خلاصه سفارش</strong><span className="text-xs text-[var(--muted)]">{itemCount.toLocaleString("fa-IR")} کالا</span></div><dl className="m-0 grid gap-3 text-[13px]"><div className="flex justify-between gap-4 text-[var(--muted)]"><dt>قیمت کالاها</dt><dd>{formatMoney(quote.subtotal, currency)}</dd></div>{quote.productDiscount > 0 && <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 font-bold text-[var(--success)]" style={{ backgroundColor: "color-mix(in srgb, var(--success) 12%, transparent)" }}><dt className="flex items-center gap-2"><PartyPopper size={16} />سود شما از خرید</dt><dd className="m-0 tabular-nums">{formatMoney(quote.productDiscount, currency)}</dd></div>}{quote.promotionDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--success)]"><dt>کد تخفیف</dt><dd>{formatMoney(quote.promotionDiscount, currency)}</dd></div>}<div className="flex justify-between gap-4 text-[var(--muted)]"><dt>هزینه ارسال و بسته‌بندی</dt><dd>{quote.shipping === 0 ? "رایگان" : formatMoney(quote.shipping, currency)}</dd></div>{quote.shippingDiscount > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--success)]"><dt>تخفیف ارسال</dt><dd>{formatMoney(quote.shippingDiscount, currency)}</dd></div>}{quote.walletApplied > 0 && <div className="flex justify-between gap-4 font-bold text-[var(--success)]"><dt>از کیف پول</dt><dd>− {formatMoney(quote.walletApplied, currency)}</dd></div>}<div className="flex justify-between gap-4 border-t border-[var(--border)] pt-4 text-base font-bold"><dt>{quote.walletApplied > 0 ? "مبلغ قابل پرداخت در درگاه" : "مبلغ قابل پرداخت"}</dt><dd>{formatMoney(quote.payable, currency)}</dd></div></dl>{quote.applications.length > 0 && <div className="mt-4 grid gap-2">{quote.applications.map((application) => <div key={`${application.title}-${application.code ?? "auto"}`} className="rounded-lg bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-2 text-xs text-[var(--success)]"><strong>{application.title}</strong>{application.code && <span className="mr-2" dir="ltr">{application.code}</span>}</div>)}</div>}{error && <InlineAlert status="danger" className="mt-4">{error}</InlineAlert>}{!settings.onlinePaymentEnabled && !cardToCardSelected && <InlineAlert status="warning" className="mt-4">پرداخت آنلاین موقتاً غیرفعال است.</InlineAlert>}<Button type="submit" fullWidth variant="primary" isPending={loading} isDisabled={(!settings.onlinePaymentEnabled && !cardToCardSelected) || !paymentProvider || checkingCoupon || !selectedAddress} className="mt-5 min-h-12 gap-2 rounded-lg bg-[var(--brand-primary)] px-5 font-bold text-[var(--brand-primary-foreground)]">{({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ثبت سفارش..." : quote.payable <= 0 ? "ثبت و پرداخت با کیف پول" : cardToCardSelected ? "ثبت سفارش و ادامه پرداخت" : "ثبت سفارش و پرداخت"}<ChevronLeft size={18} /></>}</Button></Card>

        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><BadgePercent size={18} /></span>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-bold">کد تخفیف</h2>
              <p className="mb-0 mt-1 text-xs leading-5 text-[var(--muted)]">کد تخفیف یا هدیه دارید؟ اینجا وارد کنید تا از مبلغ سفارش کم شود.</p>
            </div>
          </div>
          {couponApplied ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[var(--success)] px-3 py-2.5" style={{ backgroundColor: "color-mix(in srgb, var(--success) 8%, transparent)" }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--success)] text-white"><Ticket size={16} /></span>
              <div className="min-w-0 flex-1">
                <strong dir="ltr" className="block truncate text-left font-mono text-sm tracking-wider text-[var(--success)]">{couponCode}</strong>
                <span className="block text-xs font-bold text-[var(--success)]">{quote.promotionDiscount > 0 ? `${formatMoney(quote.promotionDiscount, currency)} تخفیف اعمال شد` : couponMessage}</span>
              </div>
              <Button type="button" isIconOnly variant="ghost" isDisabled={checkingCoupon} aria-label="حذف کد تخفیف" onPress={clearCoupon} className="size-8 min-h-8 min-w-8 shrink-0 text-[var(--muted)] hover:text-[var(--danger)]"><X size={16} /></Button>
            </div>
          ) : (
            <div className="mt-4" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (couponCode.trim() && !checkingCoupon) void refreshQuote(); } }}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><TextField name="couponCode" aria-label="کد تخفیف" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponMessage(""); setCouponError(""); }} dir="rtl" maxLength={promotionFieldLimits.code} reserveMessage={false} controlClassName="text-right uppercase placeholder:text-right" placeholder="کد تخفیف را وارد کنید" /></div>
                <Button type="button" variant="secondary" isPending={checkingCoupon} isDisabled={!couponCode.trim()} onPress={() => void refreshQuote()} className="min-h-11 shrink-0 rounded-lg px-5 font-bold">اعمال</Button>
              </div>
              {couponError && <InlineAlert compact status="danger" className="mt-3">{couponError}</InlineAlert>}
            </div>
          )}
        </Card>
      </aside>
    </form>
  );
}
