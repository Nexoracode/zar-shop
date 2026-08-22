"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Spinner } from "@heroui/react";
import { Boxes, CheckCircle2, ListPlus, ListTree, LockKeyhole, PackageSearch, Plus, Search, X } from "lucide-react";
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
    type: "SELECT" | "COLOR";
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
        if (!response.ok) throw new Error(data?.message ?? "جستجوی محصولات انجام نشد.");
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

  function clearSearch() {
    optionRequest.current?.abort();
    setQuery("");
    setSearchResponse({ query: "", results: [], error: null });
    setSelectedProduct(null);
    setOptionData(null);
    setOptionError(null);
    setLoadingOptions(false);
  }

  const remainingCharacters = Math.max(0, 3 - normalizedQuery.length);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24">
        <Card variant="secondary" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm lg:h-[min(620px,calc(100dvh-128px))] lg:min-h-[460px]">
          <Card.Content className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-4 flex shrink-0 items-start gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><PackageSearch size={20} /></span>
              <div><h2 className="m-0 text-sm font-bold text-slate-800">انتخاب محصول</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">نام، کد کالا یا نشانی انگلیسی را بنویسید.</p></div>
            </div>

            <label className="grid shrink-0 gap-1.5 text-xs font-bold text-slate-600">
              جستجوی محصول
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth autoFocus variant="secondary" className={`${adminFieldClass} min-h-11 pr-10 pl-20 text-sm`} placeholder="حداقل ۳ کاراکتر" aria-describedby="product-option-search-hint" />
                {loadingSearch && <Spinner size="sm" className="absolute left-11 top-1/2 z-10 -translate-y-1/2" aria-label="در حال جستجو" />}
                {query ? <Button type="button" isIconOnly variant="ghost" aria-label="پاک‌کردن جستجو" onPress={clearSearch} className="absolute left-1.5 top-1/2 z-20 h-8 min-h-8 w-8 min-w-8 -translate-y-1/2 rounded-lg text-slate-400 hover:text-slate-700"><X size={15} /></Button> : null}
              </div>
            </label>

            <div id="product-option-search-hint" className="mt-2 min-h-5 shrink-0 text-[10px] text-slate-400" aria-live="polite">
              {loadingSearch
                ? "در حال جستجوی محصولات..."
                : normalizedQuery.length > 0 && remainingCharacters > 0
                  ? `${remainingCharacters.toLocaleString("fa-IR")} کاراکتر دیگر وارد کنید.`
                  : normalizedQuery.length >= 3
                    ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.`
                    : "جستجو از کاراکتر سوم آغاز می‌شود."}
            </div>

            {searchError && <Alert status="danger" className="mt-3 shrink-0"><Alert.Description>{searchError}</Alert.Description></Alert>}

            {normalizedQuery.length < 3 ? (
              <div className="mt-3 grid min-h-40 flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center"><div><Search className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-xs text-slate-600">محصول را جستجو کنید</strong><span className="mt-1 block text-[10px] text-slate-400">حداقل سه کاراکتر لازم است.</span></div></div>
            ) : !loadingSearch && !searchError && results.length === 0 ? (
              <div className="mt-3 grid min-h-32 flex-1 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={26} /><strong className="block text-xs text-slate-600">محصولی پیدا نشد</strong></div></div>
            ) : results.length > 0 ? (
              <div className="admin-content-scroll mt-3 grid min-h-0 min-w-0 flex-1 content-start gap-2 overflow-x-hidden overflow-y-auto overscroll-contain pl-1" aria-label="نتایج جستجوی محصولات" tabIndex={0}>
                {results.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return <div key={product.id} className={`min-w-0 max-w-full overflow-hidden rounded-lg border p-2.5 transition ${isSelected ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50/70 hover:border-violet-200 hover:bg-white"}`}>
                    <div className="flex min-w-0 items-start gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-violet-100 text-violet-700" : "bg-white text-slate-500"}`}><ListTree size={16} /></span><div className="min-w-0 flex-1"><strong className="line-clamp-2 break-words text-xs leading-5 text-slate-800">{product.name}</strong><span dir="ltr" className="mt-0.5 block truncate text-right text-[10px] text-slate-400">{product.sku}</span></div><span className="shrink-0"><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></span></div>
                    <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-slate-200/70 pt-2"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500"><span className="min-w-0 max-w-full truncate">{product.category?.name ?? "بدون دسته‌بندی"}</span><span className="text-slate-300">•</span><span className="whitespace-nowrap">{product.stock.toLocaleString("fa-IR")} موجود</span><span className="text-slate-300">•</span><span className="whitespace-nowrap">{product._count.options.toLocaleString("fa-IR")} تنوع</span></div><Button type="button" size="sm" variant={isSelected ? "secondary" : "primary"} isDisabled={isSelected && Boolean(optionData)} isPending={isSelected && loadingOptions} onPress={() => void selectProduct(product)} className={`h-8 min-h-8 shrink-0 gap-1.5 rounded-lg px-3 text-[10px] font-bold ${isSelected ? "border-violet-200 text-violet-700" : "bg-violet-700 text-white"}`}>{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : isSelected ? <CheckCircle2 size={13} /> : <Plus size={13} />}{isPending ? "بارگذاری" : isSelected ? "انتخاب‌شده" : "انتخاب"}</>}</Button></div>
                  </div>;
                })}
              </div>
            ) : null}
          </Card.Content>
        </Card>
      </aside>

      <section className="min-w-0">
        {loadingOptions ? <LoadingOptionsPanel productName={selectedProduct?.name ?? "محصول"} /> : optionError && selectedProduct ? <OptionsErrorPanel message={optionError} onRetry={() => void selectProduct(selectedProduct)} /> : optionData && selectedProduct ? (
          <div className="grid gap-3">
            <Card variant="secondary" className="rounded-xl border border-violet-200 bg-violet-50/50 shadow-none">
              <Card.Content dir="rtl" className="grid min-w-0 justify-items-start gap-1.5 px-4 py-3 text-right">
                <span className="text-[10px] font-bold text-violet-500">محصول انتخاب‌شده</span>
                <strong className="w-full truncate text-sm text-slate-800">{optionData.productName}</strong>
                <span className="text-[10px] text-slate-500">کد محصول: <bdi dir="ltr" className="font-mono">{optionData.productSku}</bdi></span>
                <AdminStatusBadge tone={productStatusTones[selectedProduct.status]}>{productStatusLabels[selectedProduct.status]}</AdminStatusBadge>
              </Card.Content>
            </Card>
            <ProductOptionsForm key={optionData.productId} productId={optionData.productId} productStock={optionData.productStock} storeIndustry={optionData.storeIndustry} colors={optionData.colors} initialOptions={optionData.initialOptions} showBackLink={false} />
          </div>
        ) : <DisabledOptionsPanel />}
      </section>
    </div>
  );
}

function DisabledOptionsPanel() {
  return <div className="relative" aria-disabled="true">
    <Card variant="secondary" className="min-h-[420px] rounded-xl border border-slate-200 bg-white opacity-60 shadow-sm">
      <Card.Content className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400"><ListPlus size={19} /></span><div className="min-w-0"><h2 className="m-0 text-base font-bold text-slate-700">گروه‌های تنوع</h2><p className="mt-1 text-xs text-slate-400">پس از انتخاب محصول فعال می‌شود.</p></div></div>
          <Button type="button" variant="secondary" isDisabled className="shrink-0 gap-1.5 text-[11px]"><Plus size={14} />افزودن</Button>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <Input disabled fullWidth variant="secondary" placeholder="عنوان تنوع؛ مثلاً سایز یا رنگ" className={adminFieldClass} />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input disabled fullWidth variant="secondary" placeholder="مقدار قابل انتخاب" className={adminFieldClass} /><Button type="button" isDisabled variant="secondary" className="shrink-0">افزودن</Button></div>
          </div>
          <div className="grid min-h-36 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center"><div><LockKeyhole className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">ابتدا یک محصول انتخاب کنید</strong><span className="mt-1 block text-xs leading-6 text-slate-400">فرم مدیریت تنوع پس از انتخاب محصول در دسترس قرار می‌گیرد.</span></div></div>
        </div>
      </Card.Content>
    </Card>
  </div>;
}

function LoadingOptionsPanel({ productName }: { productName: string }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white shadow-sm"><Card.Content className="grid min-h-[420px] place-items-center p-6 text-center"><div><Spinner size="lg" className="mx-auto mb-4" /><strong className="block text-sm text-slate-700">در حال بارگذاری تنوع‌های «{productName}»</strong><span className="mt-1 block text-xs text-slate-400">اطلاعات موجودی و سوابق استفاده بررسی می‌شود.</span></div></Card.Content></Card>;
}

function OptionsErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card variant="secondary" className="rounded-2xl border border-rose-200 bg-white shadow-sm"><Card.Content className="grid min-h-[320px] place-items-center p-6"><div className="w-full max-w-md text-center"><Alert status="danger"><Alert.Description>{message}</Alert.Description></Alert><Button type="button" variant="secondary" onPress={onRetry} className="mt-4">تلاش دوباره</Button></div></Card.Content></Card>;
}
