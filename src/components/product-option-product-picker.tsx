"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Spinner } from "@heroui/react";
import { ArrowLeft, Boxes, ListTree, PackageSearch, Search } from "lucide-react";
import { AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
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

export function ProductOptionProductPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<{ query: string; results: ProductResult[]; error: string | null }>({ query: "", results: [], error: null });
  const [openingId, setOpeningId] = useState<string | null>(null);
  const normalizedQuery = query.trim();
  const hasCurrentResponse = searchResponse.query === normalizedQuery;
  const results = hasCurrentResponse ? searchResponse.results : [];
  const error = hasCurrentResponse ? searchResponse.error : null;
  const loading = normalizedQuery.length >= 3 && !hasCurrentResponse;

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

  function openProduct(productId: string) {
    setOpeningId(productId);
    router.push(`/admin/products/${productId}/options`);
  }

  const remainingCharacters = Math.max(0, 3 - normalizedQuery.length);

  return (
    <Card variant="secondary" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <Card.Content className="p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><PackageSearch size={21} /></span>
            <div><h2 className="m-0 text-base font-black text-slate-800">انتخاب محصول</h2><p className="mt-1 text-xs leading-6 text-slate-500">حداقل سه کاراکتر از نام محصول، کد کالا یا نشانی انگلیسی آن را بنویسید.</p></div>
          </div>

          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            جست‌وجوی محصول
            <div className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                autoFocus
                variant="secondary"
                className={`${adminFieldClass} min-h-12 px-10 text-sm`}
                placeholder="مثلاً انگشتر، ZG-102 یا gold-ring"
                aria-describedby="product-option-search-hint"
              />
              {loading && <Spinner size="sm" className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2" aria-label="در حال جست‌وجو" />}
            </div>
          </label>

          <div id="product-option-search-hint" className="mt-2 min-h-5 text-[11px] text-slate-400" aria-live="polite">
            {loading
              ? "در حال جست‌وجوی محصولات..."
              : normalizedQuery.length > 0 && remainingCharacters > 0
              ? `${remainingCharacters.toLocaleString("fa-IR")} کاراکتر دیگر وارد کنید.`
              : normalizedQuery.length >= 3 && !loading
                ? `${results.length.toLocaleString("fa-IR")} محصول پیدا شد.`
                : "جست‌وجو از کاراکتر سوم به‌صورت خودکار آغاز می‌شود."}
          </div>

          {error && <Alert status="danger" className="mt-4"><Alert.Description>{error}</Alert.Description></Alert>}

          {normalizedQuery.length < 3 ? (
            <div className="mt-5 grid min-h-56 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <div><Search className="mx-auto mb-3 text-slate-300" size={34} /><strong className="block text-sm text-slate-600">محصول موردنظر را جست‌وجو کنید</strong><span className="mt-1 block text-xs text-slate-400">نام، کد کالا یا نشانی محصول قابل جست‌وجو است.</span></div>
            </div>
          ) : !loading && !error && results.length === 0 ? (
            <div className="mt-5 grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div><Boxes className="mx-auto mb-3 text-slate-300" size={32} /><strong className="block text-sm text-slate-600">محصولی پیدا نشد</strong><span className="mt-1 block text-xs text-slate-400">عبارت دیگری از نام یا کد کالا را امتحان کنید.</span></div>
            </div>
          ) : results.length > 0 ? (
            <div className="mt-5 grid gap-2" aria-label="نتایج جست‌وجوی محصولات">
              {results.map((product) => (
                <div key={product.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-violet-200 hover:bg-violet-50/40 sm:flex-row sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><ListTree size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-slate-800">{product.name}</strong><AdminStatusBadge tone={productStatusTones[product.status]}>{productStatusLabels[product.status]}</AdminStatusBadge></div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span dir="ltr">{product.sku}</span><span>{product.category?.name ?? "بدون دسته‌بندی"}</span><span>موجودی: {product.stock.toLocaleString("fa-IR")}</span><span>{product._count.options.toLocaleString("fa-IR")} گروه تنوع</span><span>{product.storeIndustry === "GOLD" ? "طلا و جواهر" : "فروشگاه عمومی"}</span></div>
                  </div>
                  <Button type="button" variant="primary" isPending={openingId === product.id} onPress={() => openProduct(product.id)} className="min-h-10 shrink-0 gap-2 bg-violet-700 px-4 text-xs font-bold text-white">{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <ArrowLeft size={15} />}{isPending ? "در حال انتقال..." : "مدیریت تنوع"}</>}</Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
