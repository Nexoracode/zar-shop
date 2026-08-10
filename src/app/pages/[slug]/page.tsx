import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileQuestion, FileText } from "lucide-react";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { getContentSettings, contentPageBySlug } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { sanitizeProductDescription } from "@/modules/products/rich-text";

type Context = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { slug } = await params;
  const [content, store] = await Promise.all([getContentSettings(), getGeneralStoreSettings()]);
  if (slug === "faq") return { title: `سوالات متداول | ${store.storeName}` };
  const page = contentPageBySlug(content, slug);
  if (!page?.published) return {};
  return { title: `${page.title} | ${store.storeName}` };
}

export default async function ContentPage({ params }: Context) {
  const { slug } = await params;
  const content = await getContentSettings();
  if (slug === "faq") {
    const faqs = content.faqs.filter((faq) => faq.enabled);
    return <main className="px-5 py-16 sm:px-6 sm:py-24">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <header className="border-b border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-8 sm:px-10"><span className="mb-3 grid size-11 place-items-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]"><FileQuestion size={20} /></span><h1 className="m-0 text-3xl font-black text-[var(--brand-primary)] sm:text-4xl">سوالات متداول</h1><p className="mb-0 mt-3 text-sm leading-7 text-[var(--muted)]">پاسخ پرسش‌های پرتکرار درباره سفارش، پرداخت و تحویل.</p></header>
        <div className="px-5 py-8 sm:px-10 sm:py-12">{faqs.length ? <StorefrontFaqAccordion faqs={faqs} /> : <p className="m-0 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-10 text-center text-sm text-[var(--muted)]">هنوز سوال متداولی منتشر نشده است.</p>}</div>
      </section>
    </main>;
  }
  const page = contentPageBySlug(content, slug);
  if (!page?.published) notFound();

  return <main className="px-5 py-16 sm:px-6 sm:py-24">
    <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <header className="border-b border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-8 sm:px-10"><span className="mb-3 grid size-11 place-items-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]"><FileText size={20} /></span><h1 className="m-0 text-3xl font-black text-[var(--brand-primary)] sm:text-4xl">{page.title}</h1></header>
      <div className="rich-text-content px-5 py-8 text-[var(--foreground)] sm:px-10 sm:py-12" dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(page.content) }} />
    </article>
  </main>;
}
