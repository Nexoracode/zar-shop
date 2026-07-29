"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Spinner } from "@heroui/react";
import { Boxes, CheckCircle2, ListPlus, ListTree, LockKeyhole, PackageSearch, Plus, Search } from "lucide-react";
import { AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { ProductOptionsForm } from "@/components/product-options-form";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";

type ProductResult = {
  id: string;
  name: string;
  sku: string;
  status: keyof typeof productStatusLabels;
  storeIndustry: "GOLD" | "GENERAL";
  stock: number;
  category: { name: string } | null;
  _count: { options: number };
};

type OptionManagementData = {
  productId: string;
  productName: string;
  productSku: string;
  productStock: number;
  storeIndustry: "GOLD" | "GENERAL";
  colors: Array<{ id: string; name: string; hex: string }>;
  initialOptions: Array<{
    name: string;
    values: Array<{
      value: string;
      colorId: string | null;
      isActive: boolean;
      stock: number | null;
      weightGrams: string | null;
      price: string | null;
      used?: boolean;
    }>;
  }>;
};

export function ProductOptionProductPicker() {
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<{ query: string; results: ProductResult[]; error: string | null }>({ query: "", results: [], error: null });
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [optionData, setOptionData] = useState<OptionManagementData | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const optionRequest = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim();
  const hasCurrentResponse = searchResponse.query === normalizedQuery;
  const results = hasCurrentResponse ? searchResponse.results : [];
  const searchError = hasCurrentResponse ? searchResponse.error : null;
  const loadingSearch = normalizedQuery.length >= 3 && !hasCurrentResponse;

  useEffect(() => {
    if (normalizedQuery.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message ?? "جست‌وجوی محصولات انجام نشد.");
        setSearchResponse({ query: normalizedQuery, results: Array.isArray(data) ? data : [], error: null });
      } catch (reason) {
        if (controller.signal.aborted) return;
        setSearchResponse({ query: normalizedQuery, results: [], error: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد." });
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  useEffect(() => () => optionRequest.current?.abort(), []);

  async function selectProduct(product: ProductResult) {
    optionRequest.current?.abort();
    const controller = new AbortController();
    optionRequest.current = controller;
    setSelectedProduct(product);
    setOptionData(null);
    setOptionError(null);
    setLoadingOptions(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}/options`, { signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "اطلاعات تنوع محصول دریافت نشد.");
      if (!controller.signal.aborted) setOptionData(data as OptionManagementData);
    } catch (reason) {
      if (!controller.signal.aborted) setOptionError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      if (!controller.signal.aborted) setLoadingOptions(false);
    }
  }

  const remainingCharacters = Math.max(0, 3 - normalizedQuery.length);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24">
        <Card variant="secondary" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <Card.Content className="p-4">
            <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><PackageSearch size={20} /></span>
              <div><h2 className="m-0 text-sm font-black text-slate-800">انتخاب محصول</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">نام، کد کالا یا نشانی انگلیسی را بنویسید.</p></div>
            </div>

            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              جست‌وجوی محصول
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth autoFocus variant="secondary" className={`${adminFieldClass} min-h-11 px-10 text-sm`} placeholder="حداقل ۳ کاراکتر" aria-describedby="product-option-search-hint" />
                {loadingSearch && <Spinner size="sm" className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2" aria-label="در حال جست‌وجو" />}
              </div>
            </label>

            <div id="product-option-search-hint" className="mt-2 min-h-5 text-[10px] text-slate-400" aria-live="polite">
              {loadingSearch
                ? "در حال جست‌وجوی محصولات..."
                : normalizedQuery.length > 0 && remainingCharacters > 0
                  ? `${remainingCharacters.toLocaleString("fa-IR")} کاراکتر دیگر وارد کنید.`
                  : normalizedQuery.length >= 3
                    ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.`
                    : "جست‌وجو از کاراکتر سوم آغاز می‌شود."}
            </div>

            {searchError && <Alert status="danger" className="mt-3"><Alert.Description>{searchError}</Alert.Description></Alert>}

            {normalizedQuery.length < 3 ? (
              <div className="mt-4 grid min-h-40 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center"><div><Search className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-xs text-slate-600">محصول را جست‌وجو کنید</strong><span className="mt-1 block text-[10px] text-slate-400">حداقل سه کاراکتر لازم است.</span></div></div>
            ) : !loadingSearch && !searchError && results.length === 0 ? (
              <div className="mt-4 grid min-h-32 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={26} /><strong className="block text-xs text-slate-600">محصولی پیدا نشد</strong></div></div>
            ) : results.length > 0 ? (
              <div className="mt-4 grid max-h-[52vh] gap-2 overflow-y-auto pl-1" aria-label="نتایج جست‌وجوی محصولات">
                {results.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return <div key={product.id} className={`rounded-xl border p-3 transition ${isSelected ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50/70 hover:border-violet-200"}`}>
                    <div className="flex min-w-0 items-start gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-violet-600"><ListTree size={16} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{product.name}</strong><span dir="ltr" className="mt-0.5 block truncate text-right text-[10px] text-slate-400">{product.sku}</span></div><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></div>
                    <div className="mt-2 flex flex-wrap gap-x-2 text-[10px] text-slate-500"><span>موجودی {product.stock.toLocaleString("fa-IR")}</span><span>{product._count.options.toLocaleString("fa-IR")} تنوع</span><span>{product.storeIndustry === "GOLD" ? "طلا" : "عمومی"}</span></div>
                    <Button type="button" variant={isSelected ? "secondary" : "primary"} isDisabled={isSelected && Boolean(optionData)} isPending={isSelected && loadingOptions} fullWidth onPress={() => void selectProduct(product)} className={`mt-3 min-h-9 gap-2 text-xs font-bold ${isSelected ? "border-violet-200 text-violet-700" : "bg-violet-700 text-white"}`}>{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}{isPending ? "در حال بارگذاری..." : isSelected ? "محصول انتخاب‌شده" : "انتخاب محصول"}</>}</Button>
                  </div>;
                })}
              </div>
            ) : null}
          </Card.Content>
        </Card>
      </aside>

      <section className="min-w-0">
        {loadingOptions ? <LoadingOptionsPanel productName={selectedProduct?.name ?? "محصول"} /> : optionError && selectedProduct ? <OptionsErrorPanel message={optionError} onRetry={() => void selectProduct(selectedProduct)} /> : optionData && selectedProduct ? (
          <div className="grid gap-4">
            <Card variant="secondary" className="rounded-xl border border-violet-200 bg-violet-50/50 shadow-sm"><Card.Content className="flex min-h-12 items-center justify-between gap-3 px-3 py-2"><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-[10px] font-bold text-violet-500">محصول انتخاب‌شده:</span><strong className="truncate text-xs text-slate-800">{optionData.productName}</strong><span dir="ltr" className="hidden shrink-0 text-[10px] text-slate-500 sm:inline">{optionData.productSku}</span></div><AdminStatusBadge tone={productStatusTones[selectedProduct.status]}>{productStatusLabels[selectedProduct.status]}</AdminStatusBadge></Card.Content></Card>
            <ProductOptionsForm key={optionData.productId} productId={optionData.productId} productStock={optionData.productStock} storeIndustry={optionData.storeIndustry} colors={optionData.colors} initialOptions={optionData.initialOptions} showBackLink={false} />
          </div>
        ) : <DisabledOptionsPanel />}
      </section>
    </div>
  );
}

function DisabledOptionsPanel() {
  return <div className="relative" aria-disabled="true">
    <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white opacity-60 shadow-sm"><Card.Content className="p-4 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400"><ListPlus size={19} /></span><div><h2 className="text-base font-black text-slate-700">گروه‌های تنوع</h2><p className="text-xs text-slate-400">پس از انتخاب محصول فعال می‌شود.</p></div></div><Button type="button" variant="secondary" isDisabled className="gap-2"><Plus size={15} />افزودن تنوع</Button></div><div className="grid gap-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Input disabled fullWidth variant="secondary" placeholder="عنوان تنوع؛ مثلاً سایز یا رنگ" className={adminFieldClass} /><div className="mt-3 flex gap-2"><Input disabled fullWidth variant="secondary" placeholder="مقدار قابل انتخاب" className={adminFieldClass} /><Button type="button" isDisabled variant="secondary">افزودن</Button></div></div><div className="grid min-h-36 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center"><div><LockKeyhole className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">ابتدا یک محصول انتخاب کنید</strong><span className="mt-1 block text-xs text-slate-400">فرم مدیریت تنوع پس از انتخاب محصول در دسترس قرار می‌گیرد.</span></div></div></div></Card.Content></Card>
  </div>;
}

function LoadingOptionsPanel({ productName }: { productName: string }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white shadow-sm"><Card.Content className="grid min-h-[420px] place-items-center p-6 text-center"><div><Spinner size="lg" className="mx-auto mb-4" /><strong className="block text-sm text-slate-700">در حال بارگذاری تنوع‌های «{productName}»</strong><span className="mt-1 block text-xs text-slate-400">اطلاعات موجودی و سوابق استفاده بررسی می‌شود.</span></div></Card.Content></Card>;
}

function OptionsErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card variant="secondary" className="rounded-2xl border border-rose-200 bg-white shadow-sm"><Card.Content className="grid min-h-[320px] place-items-center p-6"><div className="w-full max-w-md text-center"><Alert status="danger"><Alert.Description>{message}</Alert.Description></Alert><Button type="button" variant="secondary" onPress={onRetry} className="mt-4">تلاش دوباره</Button></div></Card.Content></Card>;
}
