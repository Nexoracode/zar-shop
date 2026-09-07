"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Headset, LifeBuoy, Minus, Plus, Search } from "lucide-react";
import { faqCategoryMeta, type FaqCategory } from "@/modules/settings/faq-categories";
import { normalizeSearchText } from "@/lib/text-search";

export type StorefrontFaqItem = { id: string; question: string; answer: string; category: FaqCategory };

export function StorefrontFaq({ faqs, supportHref }: { faqs: StorefrontFaqItem[]; supportHref: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<FaqCategory, number>();
    for (const faq of faqs) counts.set(faq.category, (counts.get(faq.category) ?? 0) + 1);
    return (Object.keys(faqCategoryMeta) as FaqCategory[])
      .filter((id) => counts.has(id))
      .map((id) => ({ id, count: counts.get(id) ?? 0, ...faqCategoryMeta[id] }));
  }, [faqs]);

  const urlTopic = params.get("topic");
  const activeTopic: FaqCategory | null = categories.some((category) => category.id === urlTopic)
    ? (urlTopic as FaqCategory)
    : categories[0]?.id ?? null;

  const normalizedQuery = normalizeSearchText(query.trim());
  const searching = normalizedQuery.length >= 2;

  const visible = useMemo(() => {
    if (searching) return faqs.filter((faq) => normalizeSearchText(`${faq.question} ${faq.answer}`).includes(normalizedQuery));
    return faqs.filter((faq) => faq.category === activeTopic);
  }, [faqs, searching, normalizedQuery, activeTopic]);

  function selectTopic(id: FaqCategory) {
    setQuery("");
    setOpenId(null);
    const next = new URLSearchParams(params.toString());
    next.set("topic", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const activeMeta = activeTopic ? faqCategoryMeta[activeTopic] : null;

  return (
    <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-6 sm:w-[min(1200px,calc(100%-48px))] sm:py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]" aria-label="مسیر صفحه">
        <Link href="/" className="transition hover:text-[var(--foreground)]">خانه</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">سوالات متداول</span>
      </nav>

      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><LifeBuoy size={22} /></span>
          <div>
            <h1 className="m-0 text-xl font-bold text-[var(--foreground)] sm:text-2xl">سوالات متداول</h1>
            <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)] sm:text-sm">پاسخ پرسش‌های پرتکرار دربارهٔ خرید، پرداخت، ارسال و مرجوعی — یا در کادر زیر جست‌وجو کنید.</p>
          </div>
        </div>
        <div className="relative mt-5">
          <Search size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setOpenId(null); }}
            placeholder="جست‌وجو در سوالات متداول"
            aria-label="جست‌وجو در سوالات متداول"
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/40 pr-11 pl-4 text-sm outline-none transition focus:border-[var(--brand-primary)]"
          />
        </div>
      </header>

      {faqs.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center text-sm text-[var(--muted)]">هنوز سوال متداولی منتشر نشده است.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          {/* Topic list — sticky rail on desktop, horizontal scroller on mobile */}
          <aside aria-label="دسته‌بندی سوالات">
            <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 [scrollbar-width:none] lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => {
                const active = !searching && category.id === activeTopic;
                return (
                  <li key={category.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => selectTopic(category.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-3 text-right text-[13px] font-bold transition lg:whitespace-normal ${active ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--brand-primary)]/50"}`}
                    >
                      <span className="min-w-0 flex-1 lg:truncate">{category.label}</span>
                      <span className={`shrink-0 rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "bg-[var(--surface-secondary)] text-[var(--muted)]"}`}>{category.count.toLocaleString("fa-IR")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Answers */}
          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="m-0 text-base font-bold text-[var(--foreground)]">
                {searching ? `نتایج جست‌وجو برای «${query.trim()}»` : activeMeta?.label}
              </h2>
              <span className="text-xs text-[var(--muted)]">{visible.length.toLocaleString("fa-IR")} مورد</span>
            </div>
            {!searching && activeMeta?.description && (
              <p className="mb-3 mt-0 text-xs leading-6 text-[var(--muted)]">{activeMeta.description}</p>
            )}

            {visible.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                {searching ? "پرسشی با این عبارت پیدا نشد. می‌توانید سوال خود را از پشتیبانی بپرسید." : "برای این دسته سوالی ثبت نشده است."}
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {visible.map((faq) => {
                  const open = openId === faq.id;
                  return (
                    <li key={faq.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <h3 className="m-0">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : faq.id)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-[var(--surface-secondary)]/40"
                        >
                          <span className={`min-w-0 flex-1 text-[13px] font-bold leading-6 ${open ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>{faq.question}</span>
                          {searching && <span className="shrink-0 rounded-md bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">{faqCategoryMeta[faq.category].label}</span>}
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${open ? "border-[var(--brand-primary)] text-[var(--brand-primary)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{open ? <Minus size={14} /> : <Plus size={14} />}</span>
                        </button>
                      </h3>
                      {open && (
                        <p className="m-0 whitespace-pre-line border-t border-[var(--border)] px-4 py-3.5 text-[13px] leading-8 text-[var(--muted)]">{faq.answer}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]/40 px-5 py-6 text-center sm:flex-row sm:text-right">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><Headset size={19} /></span>
              <div className="min-w-0 flex-1">
                <strong className="block text-sm text-[var(--foreground)]">پاسخ سوالتان را پیدا نکردید؟</strong>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">تیم پشتیبانی آمادهٔ پاسخ‌گویی به پرسش‌های شماست.</span>
              </div>
              <Link href={supportHref} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-xs font-bold text-[var(--brand-primary-foreground)]">
                تماس با پشتیبانی<ChevronLeft size={15} />
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
