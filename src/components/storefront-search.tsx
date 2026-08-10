"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Input, Modal, Spinner } from "@heroui/react";
import { Clock3, Grid2X2, History, Search, Sparkles, TrendingUp, X } from "lucide-react";

type SearchItem = { id: string; label: string; href: string };
type ProductSearchItem = SearchItem & { category: string };
type SearchResponse = { query: string; products: ProductSearchItem[]; categories: SearchItem[]; popularTerms: string[] };

const emptyResponse: SearchResponse = { query: "", products: [], categories: [], popularTerms: [] };
const recentStorageKey = "storefront-recent-searches";

export function StorefrontSearch({ variant = "icon", className = "" }: { variant?: "icon" | "field"; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [response, setResponse] = useState<SearchResponse>(emptyResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openSearch() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(recentStorageKey) ?? "[]");
      setRecent(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, 8) : []);
    } catch {
      setRecent([]);
    }
    setQuery("");
    setResponse(emptyResponse);
    setError("");
    setOpen(true);
  }

  function remember(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setRecent((current) => {
      const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8);
      window.localStorage.setItem(recentStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    window.localStorage.removeItem(recentStorageKey);
  }

  function searchAll(value = query) {
    const normalized = value.trim();
    if (!normalized) return;
    remember(normalized);
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(normalized)}`);
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetch(`/api/storefront/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await result.json().catch(() => null);
        if (!result.ok) throw new Error(data?.message ?? "جست‌وجو انجام نشد.");
        setResponse(data as SearchResponse);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 260 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  const normalizedQuery = query.trim();
  const hasCurrentResponse = response.query === normalizedQuery;
  const products = hasCurrentResponse ? response.products : [];
  const categories = hasCurrentResponse ? response.categories : [];
  const popularTerms = response.query === "" ? response.popularTerms : [];

  return <>
    {variant === "field" ? <Button type="button" variant="ghost" onPress={openSearch} className={`flex h-11 w-full items-center justify-between rounded-xl bg-slate-100 px-4 text-xs font-normal text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600 ${className}`}><span>جست‌وجو در همه کالاها</span><Search size={19} /></Button> : <Button type="button" isIconOnly variant="ghost" onPress={openSearch} aria-label="جست‌وجوی محصولات" className={`size-10 min-h-10 min-w-10 rounded-lg text-inherit ${className}`}><Search size={22} strokeWidth={1.7} /></Button>}

    <Modal.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur" className="z-[100] bg-slate-950/20">
      <Modal.Container size="lg" placement="center" className="items-start px-0 pt-2 sm:pt-16">
        <Modal.Dialog aria-label="جست‌وجوی محصولات" dir="rtl" className="mx-2 max-h-[calc(100dvh-16px)] w-[calc(100%-16px)] max-w-[540px] overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-2xl sm:max-h-[calc(100dvh-96px)]">
          <Modal.Header className="block border-b border-slate-100 p-2.5">
            <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); searchAll(); }} className="relative">
              <Search className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={20} />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="عبارت جست‌وجو" placeholder="جست‌وجو در همه کالاها" variant="secondary" className="min-h-12 w-full rounded-full border-0 bg-[#f1f1f3] pr-11 pl-12 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400" />
              <Button type="button" isIconOnly variant="ghost" aria-label={query ? "پاک‌کردن عبارت" : "بستن جست‌وجو"} onPress={() => query ? setQuery("") : setOpen(false)} className="absolute left-2 top-1/2 z-20 size-9 min-h-9 min-w-9 -translate-y-1/2 rounded-full text-slate-400 hover:bg-white/80 hover:text-slate-700"><X size={19} /></Button>
            </form>
          </Modal.Header>

          <Modal.Body className="block overflow-x-hidden overflow-y-auto p-0">
            {!normalizedQuery ? <InitialSearchContent recent={recent} popularTerms={popularTerms} loading={loading} onClearRecent={clearRecent} onSelect={searchAll} onClose={() => setOpen(false)} /> : <SearchResults query={normalizedQuery} recent={recent} products={products} categories={categories} loading={loading} error={error} onSearchAll={searchAll} onRemember={remember} onClose={() => setOpen(false)} />}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}

function InitialSearchContent({ recent, popularTerms, loading, onClearRecent, onSelect, onClose }: { recent: string[]; popularTerms: string[]; loading: boolean; onClearRecent: () => void; onSelect: (value: string) => void; onClose: () => void }) {
  return <div className="grid gap-6 p-4 sm:p-5">
    {recent.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-sm font-black text-slate-800">جست‌وجوهای اخیر</h2><Button type="button" size="sm" variant="ghost" onPress={onClearRecent} className="min-h-8 px-2 text-xs font-normal text-slate-500">پاک کردن</Button></div><div className="flex flex-wrap gap-2">{recent.map((term) => <Button key={term} type="button" size="sm" variant="secondary" onPress={() => onSelect(term)} className="min-h-9 max-w-full rounded-full border border-slate-200 bg-white px-3.5 text-xs font-normal text-slate-700"><Clock3 size={14} /><span className="max-w-[min(360px,70vw)] truncate">{term}</span></Button>)}</div></section>}
    <section><h2 className="mb-3 mt-0 text-sm font-black text-slate-800">جست‌وجوهای پرتکرار</h2>{loading && !popularTerms.length ? <div className="grid min-h-20 place-items-center"><Spinner size="sm" /></div> : <div className="flex flex-wrap gap-2">{popularTerms.map((term, index) => <Button key={term} type="button" size="sm" variant="secondary" onPress={() => onSelect(term)} className="min-h-9 max-w-full rounded-full border border-slate-200 bg-white px-3.5 text-xs font-normal text-slate-700">{index < 3 ? <TrendingUp size={14} /> : <Search size={14} />}<span className="max-w-[min(360px,70vw)] truncate">{term}</span></Button>)}</div>}</section>
    <Link href="/products?sortby=popular" onClick={onClose} className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#111827,#334155)] p-5 text-white shadow-sm"><Sparkles className="absolute -left-3 -top-5 size-28 opacity-10" /><span className="relative block text-[11px] text-white/70">پیشنهاد امروز فروشگاه</span><strong className="relative mt-1 block text-lg font-black">محبوب‌ترین انتخاب‌ها را ببینید</strong><span className="relative mt-3 inline-flex rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-900">مشاهده محصولات</span></Link>
  </div>;
}

function SearchResults({ query, recent, products, categories, loading, error, onSearchAll, onRemember, onClose }: { query: string; recent: string[]; products: ProductSearchItem[]; categories: SearchItem[]; loading: boolean; error: string; onSearchAll: (value?: string) => void; onRemember: (value: string) => void; onClose: () => void }) {
  if (loading) return <div className="grid min-h-72 place-items-center"><div className="text-center"><Spinner size="md" /><span className="mt-3 block text-xs text-slate-400">در حال جست‌وجو...</span></div></div>;
  if (error) return <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-rose-600">{error}</div>;
  return <div className="divide-y divide-slate-100">
    {recent.includes(query) && <Button type="button" variant="ghost" onPress={() => onSearchAll(query)} className="flex min-h-[50px] w-full justify-start gap-3 rounded-none bg-white px-5 text-right text-sm font-normal text-slate-700 transition hover:bg-slate-50"><History size={19} className="shrink-0 text-slate-500" /><strong className="font-medium">{query}</strong></Button>}
    <Button type="button" variant="ghost" onPress={() => onSearchAll(query)} className="flex min-h-[50px] w-full justify-start gap-3 rounded-none bg-white px-5 text-right text-sm font-normal text-slate-700 transition hover:bg-slate-50"><Search size={18} className="shrink-0 text-slate-500" /><span>جست‌وجوی <strong>{query}</strong> در همه کالاها</span></Button>
    {categories.map((item) => <Link key={`category-${item.id}`} href={item.href} onClick={() => { onRemember(query); onClose(); }} className="flex min-h-[50px] items-center gap-3 px-5 text-sm text-slate-700 transition hover:bg-slate-50"><Grid2X2 size={18} className="shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="shrink-0 text-xs font-bold text-blue-600">در دسته‌بندی</span></Link>)}
    {products.map((item) => <Link key={`product-${item.id}`} href={item.href} onClick={() => { onRemember(query); onClose(); }} className="flex min-h-[50px] items-center gap-3 px-5 text-sm text-slate-700 transition hover:bg-slate-50"><Search size={18} className="shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="max-w-24 shrink-0 truncate text-xs text-blue-600">در {item.category}</span></Link>)}
    {!categories.length && !products.length && <div className="grid min-h-56 place-items-center px-6 text-center"><div><Search className="mx-auto text-slate-300" size={30} /><strong className="mt-3 block text-sm text-slate-700">نتیجه‌ای پیدا نشد</strong><span className="mt-1 block text-xs text-slate-400">عبارت دیگری را امتحان کنید.</span></div></div>}
  </div>;
}
