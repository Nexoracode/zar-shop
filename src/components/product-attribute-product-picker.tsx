"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Spinner } from "@heroui/react";
import { Boxes, CheckCircle2, ListChecks, LockKeyhole, PackageSearch, Plus, Search, X } from "lucide-react";
import { AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { ProductAttributesForm } from "@/components/product-attributes-form";
import { productStatusLabels, productStatusTones } from "@/modules/admin/labels";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";

type ProductResult = { id: string; name: string; sku: string; status: keyof typeof productStatusLabels; category: { name: string } | null };
type AttributeData = { productId: string; productName: string; productSku: string; categoryId: string | null; categoryName: string | null; groups: CategoryAttributeGroup[]; initialAttributes: ProductAttributeValue[] };

export function ProductAttributeProductPicker() {
  const [query, setQuery] = useState("");
  const [responseState, setResponseState] = useState<{ query: string; results: ProductResult[]; error: string | null }>({ query: "", results: [], error: null });
  const [selected, setSelected] = useState<ProductResult | null>(null);
  const [data, setData] = useState<AttributeData | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const productRequest = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim();
  const currentResponse = responseState.query === normalizedQuery;
  const results = currentResponse ? responseState.results : [];
  const searchError = currentResponse ? responseState.error : null;
  const loadingSearch = normalizedQuery.length >= 3 && !currentResponse;

  useEffect(() => {
    if (normalizedQuery.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message ?? "جستجوی محصولات انجام نشد.");
        setResponseState({ query: normalizedQuery, results: Array.isArray(result) ? result : [], error: null });
      } catch (reason) {
        if (!controller.signal.aborted) setResponseState({ query: normalizedQuery, results: [], error: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد." });
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalizedQuery]);

  useEffect(() => () => productRequest.current?.abort(), []);

  async function selectProduct(product: ProductResult) {
    productRequest.current?.abort();
    const controller = new AbortController();
    productRequest.current = controller;
    setSelected(product); setData(null); setProductError(null); setLoadingProduct(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}/attributes`, { signal: controller.signal });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "اطلاعات ویژگی‌های محصول دریافت نشد.");
      if (!controller.signal.aborted) setData(result as AttributeData);
    } catch (reason) {
      if (!controller.signal.aborted) setProductError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally { if (!controller.signal.aborted) setLoadingProduct(false); }
  }

  function clearSearch() {
    productRequest.current?.abort();
    setQuery(""); setResponseState({ query: "", results: [], error: null }); setSelected(null); setData(null); setProductError(null);
  }

  const remaining = Math.max(0, 3 - normalizedQuery.length);
  return <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
    <aside className="min-w-0 lg:sticky lg:top-24"><Card variant="secondary" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm lg:h-[min(620px,calc(100dvh-128px))] lg:min-h-[460px]"><Card.Content className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-4 flex shrink-0 items-start gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><PackageSearch size={20} /></span><div><h2 className="m-0 text-sm font-black text-slate-800">انتخاب محصول</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">نام، کد کالا یا نشانی انگلیسی را بنویسید.</p></div></div>
      <label className="grid shrink-0 gap-1.5 text-xs font-bold text-slate-600">جستجوی محصول<div className="relative"><Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth autoFocus variant="secondary" className={`${adminFieldClass} min-h-11 pr-10 pl-20 text-sm`} placeholder="حداقل ۳ کاراکتر" />{loadingSearch && <Spinner size="sm" className="absolute left-11 top-1/2 z-10 -translate-y-1/2" />}{query && <Button type="button" isIconOnly variant="ghost" aria-label="پاک‌کردن جستجو" onPress={clearSearch} className="absolute left-1.5 top-1/2 z-20 size-8 min-h-8 min-w-8 -translate-y-1/2 rounded-lg text-slate-400"><X size={15} /></Button>}</div></label>
      <div className="mt-2 min-h-5 shrink-0 text-[10px] text-slate-400">{loadingSearch ? "در حال جستجوی محصولات..." : normalizedQuery.length > 0 && remaining > 0 ? `${remaining.toLocaleString("fa-IR")} کاراکتر دیگر وارد کنید.` : normalizedQuery.length >= 3 ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.` : "جستجو از کاراکتر سوم آغاز می‌شود."}</div>
      {searchError && <Alert status="danger" className="mt-3"><Alert.Description>{searchError}</Alert.Description></Alert>}
      {normalizedQuery.length < 3 ? <div className="mt-3 grid min-h-40 flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center"><div><Search className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-xs text-slate-600">محصول را جستجو کنید</strong></div></div> : !loadingSearch && !searchError && !results.length ? <div className="mt-3 grid min-h-32 flex-1 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={26} /><strong className="block text-xs text-slate-600">محصولی پیدا نشد</strong></div></div> : <div className="admin-content-scroll mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pl-1">{results.map((product) => { const active = selected?.id === product.id; return <div key={product.id} className={`min-w-0 rounded-lg border p-2.5 ${active ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50/70"}`}><div className="flex items-start gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-violet-100 text-violet-700" : "bg-white text-slate-500"}`}><ListChecks size={16} /></span><div className="min-w-0 flex-1"><strong className="line-clamp-2 text-xs leading-5 text-slate-800">{product.name}</strong><span dir="ltr" className="block truncate text-right font-mono text-[10px] text-slate-400">{product.sku}</span></div><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></div><div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2"><span className="min-w-0 truncate text-[10px] text-slate-500">{product.category?.name ?? "بدون دسته‌بندی"}</span><Button type="button" size="sm" variant={active ? "secondary" : "primary"} isPending={active && loadingProduct} isDisabled={active && Boolean(data)} onPress={() => void selectProduct(product)} className="h-8 min-h-8 shrink-0 gap-1.5 px-3 text-[10px] font-bold">{({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : active ? <CheckCircle2 size={13} /> : <Plus size={13} />}{isPending ? "بارگذاری" : active ? "انتخاب‌شده" : "انتخاب"}</>}</Button></div></div>; })}</div>}
    </Card.Content></Card></aside>
    <section className="min-w-0">{loadingProduct ? <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white"><Card.Content className="grid min-h-[420px] place-items-center"><Spinner size="lg" /></Card.Content></Card> : productError && selected ? <Alert status="danger"><Alert.Description>{productError}</Alert.Description></Alert> : data ? <div className="grid gap-3"><Card variant="secondary" className="rounded-xl border border-violet-200 bg-violet-50/50 shadow-none"><Card.Content className="px-4 py-3"><span className="text-[10px] font-bold text-violet-500">محصول انتخاب‌شده</span><strong className="mt-1 block truncate text-sm text-slate-800">{data.productName}</strong><p className="mb-0 mt-1 text-[10px] text-slate-500">ویژگی‌های این محصول از دسته «{data.categoryName ?? "بدون دسته‌بندی"}» خوانده می‌شوند.</p></Card.Content></Card><ProductAttributesForm key={data.productId} productId={data.productId} categoryId={data.categoryId} categoryName={data.categoryName} groups={data.groups} initialAttributes={data.initialAttributes} /></div> : <Card variant="secondary" className="min-h-[420px] rounded-xl border border-slate-200 bg-white opacity-60"><Card.Content className="grid place-items-center p-6 text-center"><div><LockKeyhole className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">ابتدا یک محصول انتخاب کنید</strong><span className="mt-1 block text-xs text-slate-400">فرم ویژگی‌های محصول پس از انتخاب فعال می‌شود.</span></div></Card.Content></Card>}</section>
  </div>;
}
