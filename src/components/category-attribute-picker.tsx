"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input, Spinner } from "@heroui/react";
import { Boxes, CheckCircle2, FolderSearch, Layers3, LockKeyhole, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AdminStatusBadge, adminFieldClass } from "@/components/admin-ui";
import { CategoryAttributesForm } from "@/components/category-attributes-form";
import type { CategoryAttributeGroup } from "@/modules/products/attributes";

type CategoryResult = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentName: string | null;
  productCount: number;
  groupCount: number;
  attributeCount: number;
};

type AttributeData = { id: string; name: string; groups: CategoryAttributeGroup[] };

export function CategoryAttributePicker({ categories }: { categories: CategoryResult[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryResult | null>(null);
  const [attributeData, setAttributeData] = useState<AttributeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("fa-IR");
  const remainingCharacters = Math.max(0, 3 - normalizedQuery.length);
  const results = normalizedQuery.length < 3 ? [] : categories.filter((category) =>
    [category.name, category.slug, category.parentName ?? ""].some((value) => value.toLocaleLowerCase("fa-IR").includes(normalizedQuery)),
  );

  useEffect(() => () => request.current?.abort(), []);

  async function selectCategory(category: CategoryResult) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSelectedCategory(category);
    setAttributeData(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${category.id}/attributes`, { signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "اطلاعات ویژگی‌های دسته‌بندی دریافت نشد.");
      if (!controller.signal.aborted) setAttributeData(data as AttributeData);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function clearSearch() {
    request.current?.abort();
    setQuery("");
    setSelectedCategory(null);
    setAttributeData(null);
    setError(null);
    setLoading(false);
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24">
        <Card variant="secondary" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm lg:h-[min(620px,calc(100dvh-128px))] lg:min-h-[460px]">
          <Card.Content className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-4 flex shrink-0 items-start gap-3 border-b border-slate-100 pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><FolderSearch size={20} /></span>
              <div><h2 className="m-0 text-sm font-black text-slate-800">انتخاب دسته‌بندی</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">نام، نشانی یا دسته والد را بنویسید.</p></div>
            </div>

            <label className="grid shrink-0 gap-1.5 text-xs font-bold text-slate-600">
              جستجوی دسته‌بندی
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} fullWidth autoFocus variant="secondary" className={`${adminFieldClass} min-h-11 pr-10 pl-12 text-sm`} placeholder="حداقل ۳ کاراکتر" aria-describedby="category-attribute-search-hint" />
                {query && <Button type="button" isIconOnly variant="ghost" aria-label="پاک‌کردن جستجو" onPress={clearSearch} className="absolute left-1.5 top-1/2 z-20 size-8 min-h-8 min-w-8 -translate-y-1/2 rounded-lg text-slate-400 hover:text-slate-700"><X size={15} /></Button>}
              </div>
            </label>

            <div id="category-attribute-search-hint" className="mt-2 min-h-5 shrink-0 text-[10px] text-slate-400" aria-live="polite">
              {normalizedQuery.length > 0 && remainingCharacters > 0
                ? `${remainingCharacters.toLocaleString("fa-IR")} کاراکتر دیگر وارد کنید.`
                : normalizedQuery.length >= 3
                  ? `${results.length.toLocaleString("fa-IR")} دسته‌بندی پیدا شد.`
                  : "جستجو از کاراکتر سوم آغاز می‌شود."}
            </div>

            {normalizedQuery.length < 3 ? (
              <div className="mt-3 grid min-h-40 flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center"><div><Search className="mx-auto mb-2 text-slate-300" size={28} /><strong className="block text-xs text-slate-600">دسته‌بندی را جستجو کنید</strong><span className="mt-1 block text-[10px] text-slate-400">حداقل سه کاراکتر لازم است.</span></div></div>
            ) : results.length === 0 ? (
              <div className="mt-3 grid min-h-32 flex-1 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><div><Boxes className="mx-auto mb-2 text-slate-300" size={26} /><strong className="block text-xs text-slate-600">دسته‌بندی‌ای پیدا نشد</strong></div></div>
            ) : (
              <div className="admin-content-scroll mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pl-1" aria-label="نتایج جستجوی دسته‌بندی‌ها" tabIndex={0}>
                {results.map((category) => {
                  const selected = selectedCategory?.id === category.id;
                  return <div key={category.id} className={`rounded-lg border p-2.5 transition ${selected ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50/70 hover:border-violet-200 hover:bg-white"}`}>
                    <div className="flex min-w-0 items-start gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-violet-100 text-violet-700" : "bg-white text-slate-500"}`}><SlidersHorizontal size={16} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{category.name}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-400">{category.parentName ? `زیرمجموعه ${category.parentName}` : "دسته اصلی"}</span></div><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2"><div className="flex min-w-0 gap-2 text-[10px] text-slate-500"><span>{category.groupCount.toLocaleString("fa-IR")} گروه</span><span>•</span><span>{category.attributeCount.toLocaleString("fa-IR")} ویژگی</span><span>•</span><span>{category.productCount.toLocaleString("fa-IR")} محصول</span></div><Button type="button" size="sm" variant={selected ? "secondary" : "primary"} isDisabled={selected && Boolean(attributeData)} isPending={selected && loading} onPress={() => void selectCategory(category)} className={`h-8 min-h-8 shrink-0 gap-1.5 rounded-lg px-3 text-[10px] font-bold ${selected ? "border-violet-200 text-violet-700" : "bg-violet-700 text-white"}`}>{({ isPending }) => <>{isPending ? <Spinner size="sm" color="current" /> : selected ? <CheckCircle2 size={13} /> : <Plus size={13} />}{isPending ? "بارگذاری" : selected ? "انتخاب‌شده" : "انتخاب"}</>}</Button></div>
                  </div>;
                })}
              </div>
            )}
          </Card.Content>
        </Card>
      </aside>

      <section className="min-w-0">
        {loading && selectedCategory ? <LoadingPanel categoryName={selectedCategory.name} /> : error && selectedCategory ? <ErrorPanel message={error} onRetry={() => void selectCategory(selectedCategory)} /> : attributeData && selectedCategory ? (
          <div className="grid gap-3">
            <Card variant="secondary" className="rounded-xl border border-violet-200 bg-violet-50/50 shadow-none"><Card.Content dir="rtl" className="grid justify-items-start gap-1.5 px-4 py-3 text-right"><span className="text-[10px] font-bold text-violet-500">دسته‌بندی انتخاب‌شده</span><strong className="w-full truncate text-sm text-slate-800">{attributeData.name}</strong><span className="text-[10px] text-slate-500">{selectedCategory.parentName ? `زیرمجموعه ${selectedCategory.parentName}` : "دسته‌بندی اصلی"}</span><AdminStatusBadge tone={selectedCategory.isActive ? "success" : "neutral"}>{selectedCategory.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></Card.Content></Card>
            <CategoryAttributesForm key={attributeData.id} categoryId={attributeData.id} initialGroups={attributeData.groups} />
          </div>
        ) : <DisabledPanel />}
      </section>
    </div>
  );
}

function DisabledPanel() {
  return <Card variant="secondary" className="min-h-[420px] rounded-xl border border-slate-200 bg-white opacity-60 shadow-sm" aria-disabled="true"><Card.Content className="grid gap-4 p-4 sm:p-5"><div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400"><Layers3 size={19} /></span><div><h2 className="m-0 text-base font-black text-slate-700">ساختار ویژگی‌ها</h2><p className="mt-1 text-xs text-slate-400">پس از انتخاب دسته‌بندی فعال می‌شود.</p></div></div><Button type="button" variant="secondary" isDisabled className="gap-2 text-xs"><Plus size={14} />گروه جدید</Button></div><div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><Input disabled fullWidth variant="secondary" placeholder="نام گروه؛ مثلاً مشخصات کلی" className={adminFieldClass} /><Input disabled fullWidth variant="secondary" placeholder="نام ویژگی؛ مثلاً رم یا مناسب برای" className={adminFieldClass} /></div><div className="grid min-h-40 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center"><div><LockKeyhole className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">ابتدا یک دسته‌بندی انتخاب کنید</strong><span className="mt-1 block text-xs leading-6 text-slate-400">فرم تعریف گروه و ویژگی پس از انتخاب دسته‌بندی در دسترس قرار می‌گیرد.</span></div></div></Card.Content></Card>;
}

function LoadingPanel({ categoryName }: { categoryName: string }) {
  return <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white shadow-sm"><Card.Content className="grid min-h-[420px] place-items-center p-6 text-center"><div><Spinner size="lg" className="mx-auto mb-4" /><strong className="block text-sm text-slate-700">در حال بارگذاری ویژگی‌های «{categoryName}»</strong><span className="mt-1 block text-xs text-slate-400">ساختار گروه‌ها و ویژگی‌ها دریافت می‌شود.</span></div></Card.Content></Card>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card variant="secondary" className="rounded-xl border border-rose-200 bg-white shadow-sm"><Card.Content className="grid min-h-[320px] place-items-center p-6"><div className="w-full max-w-md text-center"><Alert status="danger"><Alert.Description>{message}</Alert.Description></Alert><Button type="button" variant="secondary" onPress={onRetry} className="mt-4">تلاش دوباره</Button></div></Card.Content></Card>;
}
