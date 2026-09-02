"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { PackageSearch, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { formatMoney } from "@/lib/format";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton, BpInput, BpNumberInput, BpSeg, BpSelect, BpSpinner } from "./ui";

type CustomerHit = { id: string; name: string; phone: string | null; email: string | null; isGuest: boolean; orderCount: number };
type VariantOption = { selectionKey: string; label: string; stock: number };
type ProductHit = { id: string; name: string; sku: string; status: string; storeIndustry: "GOLD" | "GENERAL"; category: { name: string } | null; _count: { variants: number } };
type LineDraft = { key: string; productId: string; name: string; sku: string; variants: VariantOption[]; hasVariants: boolean; selectionKey: string; quantity: string };
type NameId = { id: string; name: string };
type QuoteLine = { productId: string; selectionKey: string; name: string; quantity: number; originalUnitPrice: number; unitPrice: number; lineTotal: number };
type Quote = { lines: QuoteLine[]; goldRate: string; subtotal: number; productDiscount: number; tax: number; merchandiseAmount: number; shipping: number; shippingMethodTitle: string | null; total: number };

let lineCounter = 0;
const nextKey = () => `line-${(lineCounter += 1)}`;

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bp-frame relative">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
        {icon && <span className="text-[var(--bp-muted)]">{icon}</span>}
        <h2 className="m-0 text-[14px] font-bold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function BlueprintManualOrderForm() {
  const router = useRouter();

  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerHit[]>([]);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", phone: "" });

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductHit[]>([]);
  const [items, setItems] = useState<LineDraft[]>([]);

  const [delivery, setDelivery] = useState<"STORE_PICKUP" | "INSURED_SHIPPING">("STORE_PICKUP");
  const [address, setAddress] = useState({ recipient: "", phone: "", provinceId: "", cityId: "", postalCode: "", addressLine: "" });
  const [provinces, setProvinces] = useState<NameId[]>([]);
  const [cities, setCities] = useState<NameId[]>([]);
  const [shippingMethods, setShippingMethods] = useState<NameId[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState("");

  const [payment, setPayment] = useState<"PAID" | "PENDING">("PAID");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const debouncedCustomerQuery = useDebounced(customerQuery.trim(), 400);
  const debouncedProductQuery = useDebounced(productQuery.trim(), 400);

  // — customer search —
  useEffect(() => {
    if (customerMode !== "existing" || debouncedCustomerQuery.length < 3) return;
    const controller = new AbortController();
    fetch(`/api/admin/users/search?q=${encodeURIComponent(debouncedCustomerQuery)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (Array.isArray(data)) setCustomerResults(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedCustomerQuery, customerMode]);
  const customerResultsShown = customerMode === "existing" && !customer && customerQuery.trim().length >= 3 ? customerResults : [];

  // — product search —
  useEffect(() => {
    if (debouncedProductQuery.length < 3) return;
    const controller = new AbortController();
    fetch(`/api/admin/products/search?q=${encodeURIComponent(debouncedProductQuery)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (Array.isArray(data)) setProductResults(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedProductQuery]);
  const productResultsShown = productQuery.trim().length >= 3 ? productResults : [];

  // — locations & shipping methods —
  useEffect(() => {
    fetch("/api/locations/provinces").then((response) => response.json()).then((data) => setProvinces(data.items ?? [])).catch(() => {});
    requestJson<{ items: Array<{ id: string; title: string }> }>("/api/admin/shipping-methods")
      .then((data) => setShippingMethods(data.items.map((method) => ({ id: method.id, name: method.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!address.provinceId) return;
    const controller = new AbortController();
    fetch(`/api/locations/cities?provinceId=${encodeURIComponent(address.provinceId)}`, { signal: controller.signal }).then((response) => response.json()).then((data) => setCities(data.items ?? [])).catch(() => {});
    return () => controller.abort();
  }, [address.provinceId]);

  async function addProduct(hit: ProductHit) {
    setProductQuery("");
    setProductResults([]);
    if (items.some((item) => item.productId === hit.id && item.variants.length === 0)) return;
    try {
      const data = await requestJson<{ id: string; name: string; sku: string; storeIndustry: "GOLD" | "GENERAL"; variants: VariantOption[] }>(`/api/admin/orders/product-options?productId=${encodeURIComponent(hit.id)}`, {}, { fallbackMessage: "دریافت تنوع‌های محصول انجام نشد." });
      setItems((current) => [...current, {
        key: nextKey(),
        productId: data.id,
        name: data.name,
        sku: data.sku,
        variants: data.variants,
        hasVariants: data.variants.length > 0,
        selectionKey: data.variants.length === 1 ? data.variants[0].selectionKey : "",
        quantity: "1",
      }]);
    } catch (reason) {
      toast.danger("افزودن محصول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    }
  }

  function updateItem(key: string, patch: Partial<LineDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  const readyForQuote = items.length > 0
    && items.every((item) => (!item.hasVariants || item.selectionKey) && Number(item.quantity) >= 1)
    && (delivery === "STORE_PICKUP" || !shippingMethodId || Boolean(address.provinceId));

  const runQuote = useCallback(async () => {
    if (!readyForQuote) { setQuote(null); setQuoteError(""); return; }
    setQuoting(true);
    setQuoteError("");
    try {
      const body = {
        items: items.map((item) => ({ productId: item.productId, selectionKey: item.selectionKey, quantity: Number(item.quantity) })),
        delivery: delivery === "STORE_PICKUP"
          ? { method: "STORE_PICKUP" as const }
          : { method: "INSURED_SHIPPING" as const, shippingMethodId: shippingMethodId || null, address: { ...addressPayload() } },
      };
      const data = await requestJson<Quote>("/api/admin/orders/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, { fallbackMessage: "محاسبهٔ مبلغ انجام نشد." });
      setQuote(data);
    } catch (reason) {
      setQuote(null);
      setQuoteError(requestErrorMessage(reason, "محاسبهٔ مبلغ انجام نشد."));
    } finally {
      setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyForQuote, items, delivery, shippingMethodId, address]);

  const quoteTrigger = useDebounced(JSON.stringify({ items, delivery, shippingMethodId, address }), 500);
  useEffect(() => {
    const id = window.setTimeout(() => { void runQuote(); }, 0);
    return () => window.clearTimeout(id);
  }, [quoteTrigger, runQuote]);

  function addressPayload() {
    return {
      recipient: address.recipient,
      phone: address.phone,
      provinceId: address.provinceId,
      cityId: address.cityId || null,
      province: provinces.find((province) => province.id === address.provinceId)?.name ?? "",
      city: cities.find((city) => city.id === address.cityId)?.name ?? "",
      postalCode: address.postalCode,
      addressLine: address.addressLine,
    };
  }

  function validate(): string | null {
    if (customerMode === "existing" && !customer) return "یک مشتری را از فهرست انتخاب کنید.";
    if (customerMode === "new" && (newCustomer.firstName.trim().length < 2 || newCustomer.lastName.trim().length < 2 || !/^09\d{9}$/.test(newCustomer.phone))) return "نام، نام خانوادگی و شمارهٔ موبایل مشتری جدید را کامل وارد کنید.";
    if (!items.length) return "حداقل یک قلم به سفارش اضافه کنید.";
    if (items.some((item) => item.hasVariants && !item.selectionKey)) return "برای هر قلمِ دارای تنوع، تنوع آن را انتخاب کنید.";
    if (delivery === "INSURED_SHIPPING") {
      if (address.recipient.trim().length < 2 || !/^09\d{9}$/.test(address.phone) || !address.provinceId || !/^\d{10}$/.test(address.postalCode) || address.addressLine.trim().length < 5) return "اطلاعات آدرس ارسال کامل نیست.";
    }
    return null;
  }

  async function submit() {
    const error = validate();
    if (error) { setFormError(error); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const body = {
        customer: customerMode === "existing" ? { userId: customer!.id } : { newCustomer: { firstName: newCustomer.firstName.trim(), lastName: newCustomer.lastName.trim(), phone: newCustomer.phone } },
        items: items.map((item) => ({ productId: item.productId, selectionKey: item.selectionKey, quantity: Number(item.quantity) })),
        delivery: delivery === "STORE_PICKUP" ? { method: "STORE_PICKUP" } : { method: "INSURED_SHIPPING", shippingMethodId: shippingMethodId || null, address: addressPayload() },
        payment,
      };
      const result = await requestJson<{ id: string; orderNumber: string }>("/api/admin/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, { fallbackMessage: "ثبت سفارش انجام نشد." });
      toast.success("سفارش ثبت شد", { description: `شمارهٔ سفارش: ${result.orderNumber}` });
      router.push(`/admin/orders/${result.id}`);
    } catch (reason) {
      setFormError(requestErrorMessage(reason, "ثبت سفارش انجام نشد."));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="ثبت سفارش دستی" description="یک سفارش را از پنل ثبت کنید؛ قیمت‌ها با همان منطق فروشگاه — شامل نرخ لحظه‌ای طلا — محاسبه می‌شوند." backHref="/admin/orders" backLabel="بازگشت به سفارش‌ها" />

      <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-2">
          <Panel title="مشتری" icon={<UserRound size={16} />}>
            <BpSeg
              label="نوع مشتری"
              value={customerMode}
              onChange={(value) => { setCustomerMode(value); setCustomer(null); }}
              options={[{ value: "existing", label: "کاربر موجود" }, { value: "new", label: "مشتری جدید" }]}
              className="mb-3"
            />
            {customerMode === "existing" ? (
              customer ? (
                <div className="flex items-center gap-2 border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] p-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px]">{customer.name}</strong>
                    <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{customer.phone ?? customer.email ?? "—"} · {customer.orderCount.toLocaleString("fa-IR")} سفارش</span>
                  </div>
                  <BpButton type="button" isIconOnly size="sm" variant="ghost" aria-label="تغییر مشتری" onClick={() => setCustomer(null)}><X size={14} /></BpButton>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
                  <input type="search" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} aria-label="جستجوی مشتری" placeholder="نام، موبایل یا ایمیل (حداقل ۳ نویسه)" className="bp-input bp-input-search" />
                  {customerResultsShown.length > 0 && (
                    <div className="bp-scroll mt-1.5 grid max-h-56 gap-1 overflow-y-auto">
                      {customerResultsShown.map((hit) => (
                        <button key={hit.id} type="button" onClick={() => { setCustomer(hit); setCustomerQuery(""); }} className="border border-[var(--bp-divider)] p-2 text-start hover:border-[var(--bp-accent)]">
                          <strong className="block truncate text-[12px]">{hit.name}{hit.isGuest && <span className="bp-muted"> · حضوری</span>}</strong>
                          <span dir="ltr" className="bp-muted block truncate text-right text-[10px]">{hit.phone ?? hit.email ?? "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <BpInput label="نام" value={newCustomer.firstName} maxLength={100} onChange={(event) => setNewCustomer((current) => ({ ...current, firstName: event.target.value }))} />
                <BpInput label="نام خانوادگی" value={newCustomer.lastName} maxLength={100} onChange={(event) => setNewCustomer((current) => ({ ...current, lastName: event.target.value }))} />
                <BpInput label="موبایل" dir="ltr" inputMode="numeric" maxLength={11} value={newCustomer.phone} placeholder="09xxxxxxxxx" onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 11) }))} />
              </div>
            )}
          </Panel>

          <Panel title="اقلام سفارش" icon={<PackageSearch size={16} />}>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
              <input type="search" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} aria-label="جستجوی محصول" placeholder="نام یا کد کالای محصول (حداقل ۳ نویسه)" className="bp-input bp-input-search" />
              {productResultsShown.length > 0 && (
                <div className="bp-scroll mt-1.5 grid max-h-56 gap-1 overflow-y-auto">
                  {productResultsShown.map((hit) => (
                    <button key={hit.id} type="button" onClick={() => void addProduct(hit)} className="flex items-center gap-2 border border-[var(--bp-divider)] p-2 text-start hover:border-[var(--bp-accent)]">
                      <span className="min-w-0 flex-1"><strong className="block truncate text-[12px]">{hit.name}</strong><span dir="ltr" className="bp-muted block truncate text-right text-[10px]">{hit.sku}</span></span>
                      <Plus size={14} className="shrink-0 text-[var(--bp-accent)]" aria-hidden />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-6 text-center text-[12px]">هنوز قلمی اضافه نشده است.</p>
            ) : (
              <div className="grid gap-2">
                {items.map((item) => (
                  <div key={item.key} className="grid gap-2 border border-[var(--bp-divider)] p-3 sm:grid-cols-[minmax(0,1fr)_130px_92px_auto] sm:items-end">
                    <div className="min-w-0">
                      <strong className="block truncate text-[12px]" title={item.name}>{item.name}</strong>
                      <span dir="ltr" className="bp-muted block truncate text-right text-[10px]">{item.sku}</span>
                    </div>
                    {item.hasVariants ? (
                      <BpSelect aria-label={`تنوع ${item.name}`} value={item.selectionKey} reserveMessage={false} placeholder="انتخاب تنوع" onChange={(event) => updateItem(item.key, { selectionKey: event.target.value })} options={item.variants.map((variant) => ({ value: variant.selectionKey, label: `${variant.label}${variant.stock > 0 ? "" : " (ناموجود)"}`, disabled: variant.stock <= 0 }))} />
                    ) : <span className="bp-muted text-[11px] sm:pb-2">بدون تنوع</span>}
                    <BpNumberInput aria-label={`تعداد ${item.name}`} value={item.quantity} reserveMessage={false} onValueChange={(value) => updateItem(item.key, { quantity: value.replace(/\D/g, "") || "1" })} />
                    <BpButton type="button" isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)] sm:mb-0.5" aria-label={`حذف ${item.name}`} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}><Trash2 size={14} /></BpButton>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="تحویل">
            <BpSeg
              label="روش تحویل"
              value={delivery}
              onChange={setDelivery}
              options={[{ value: "STORE_PICKUP", label: "تحویل حضوری" }, { value: "INSURED_SHIPPING", label: "ارسال بیمه‌شده" }]}
              className="mb-3"
            />
            {delivery === "INSURED_SHIPPING" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <BpInput label="تحویل‌گیرنده" value={address.recipient} maxLength={100} onChange={(event) => setAddress((current) => ({ ...current, recipient: event.target.value }))} />
                <BpInput label="شمارهٔ تماس" dir="ltr" inputMode="numeric" maxLength={11} value={address.phone} placeholder="09xxxxxxxxx" onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 11) }))} />
                <BpSelect label="استان" value={address.provinceId} onChange={(event) => setAddress((current) => ({ ...current, provinceId: event.target.value, cityId: "" }))} placeholder="انتخاب استان" options={provinces.map((province) => ({ value: province.id, label: province.name }))} />
                <BpSelect label="شهر" value={address.cityId} disabled={!address.provinceId} onChange={(event) => setAddress((current) => ({ ...current, cityId: event.target.value }))} placeholder="انتخاب شهر" options={cities.map((city) => ({ value: city.id, label: city.name }))} />
                <BpInput label="کد پستی" dir="ltr" inputMode="numeric" maxLength={10} value={address.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value.replace(/\D/g, "").slice(0, 10) }))} />
                <BpSelect label="روش ارسال" value={shippingMethodId} onChange={(event) => setShippingMethodId(event.target.value)} placeholder="بدون هزینهٔ ارسال" options={shippingMethods.map((method) => ({ value: method.id, label: method.name }))} />
                <BpInput label="نشانی" wrapperClassName="sm:col-span-2" value={address.addressLine} maxLength={500} onChange={(event) => setAddress((current) => ({ ...current, addressLine: event.target.value }))} />
              </div>
            )}
          </Panel>

          <Panel title="پرداخت">
            <BpSeg
              label="وضعیت پرداخت"
              value={payment}
              onChange={setPayment}
              options={[{ value: "PAID", label: "پرداخت‌شده (نقدی/POS)" }, { value: "PENDING", label: "در انتظار پرداخت" }]}
            />
            <p className="bp-muted m-0 mt-2 text-[11px]">
              {payment === "PAID" ? "سفارش با وضعیت «پرداخت‌شده» و یک تراکنش دستی موفق ثبت می‌شود." : "سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود و طبق تنظیمات منقضی خواهد شد."}
            </p>
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-2 xl:sticky xl:top-20">
          <section className="bp-frame relative">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
              <h2 className="m-0 text-[14px] font-bold">خلاصهٔ مبالغ</h2>
              {quoting && <BpSpinner size={15} />}
            </div>
            <div className="p-4">
              {quoteError ? (
                <p className="m-0 text-[12px] text-[var(--bp-danger)]">{quoteError}</p>
              ) : !quote ? (
                <p className="bp-muted m-0 text-[12px]">پس از افزودن اقلام، مبلغ محاسبه می‌شود.</p>
              ) : (
                <dl className="grid gap-2 text-[13px]">
                  {quote.lines.map((line) => (
                    <div key={`${line.productId}:${line.selectionKey}`} className="bp-muted flex justify-between gap-2">
                      <dt className="min-w-0 truncate">{line.name} × {line.quantity.toLocaleString("fa-IR")}</dt>
                      <dd className="shrink-0">{formatMoney(String(line.lineTotal))}</dd>
                    </div>
                  ))}
                  <div className="bp-muted flex justify-between gap-2 border-t border-[var(--bp-divider)] pt-2"><dt>جمع کالاها</dt><dd>{formatMoney(String(quote.subtotal))}</dd></div>
                  {quote.productDiscount > 0 && <div className="flex justify-between gap-2 text-[var(--bp-danger)]"><dt>تخفیف</dt><dd>{formatMoney(String(quote.productDiscount))}</dd></div>}
                  <div className="bp-muted flex justify-between gap-2"><dt>مالیات</dt><dd>{formatMoney(String(quote.tax))}</dd></div>
                  <div className="bp-muted flex justify-between gap-2"><dt>هزینهٔ ارسال{quote.shippingMethodTitle ? ` (${quote.shippingMethodTitle})` : ""}</dt><dd>{formatMoney(String(quote.shipping))}</dd></div>
                  <div className="flex justify-between gap-2 border-t border-[var(--bp-divider)] pt-2 font-bold"><dt>مبلغ نهایی</dt><dd>{formatMoney(String(quote.total))}</dd></div>
                  {Number(quote.goldRate) > 0 && <div className="flex justify-between gap-2 border border-[var(--bp-divider)] px-2 py-1.5 text-[11px] font-bold"><dt>نرخ طلای لحظه‌ای</dt><dd>{formatMoney(quote.goldRate)}</dd></div>}
                </dl>
              )}
            </div>
          </section>

          {formError && <p className="m-0 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] p-3 text-[12px] text-[var(--bp-danger)]">{formError}</p>}

          <BpButton type="button" variant="primary" fullWidth isPending={submitting} disabled={!quote || Boolean(quoteError)} onClick={() => void submit()}>ثبت سفارش</BpButton>
        </aside>
      </div>
    </div>
  );
}
