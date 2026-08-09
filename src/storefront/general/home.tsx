import Image from "next/image";
import Link from "next/link";
import { Headphones, PackageCheck, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { db } from "@/lib/db";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId } from "@/modules/settings/homepage-settings";
import { buildStorefrontHeroSlides } from "@/storefront/shared/hero";

const container = "mx-auto w-[min(1440px,calc(100%-32px))] lg:w-[min(1440px,calc(100%-80px))]";

export async function GeneralHome() {
  const [settings, homepage, content, productFeed, categories] = await Promise.all([
    getGeneralStoreSettings(),
    getHomepageSettings(),
    getContentSettings(),
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    db.category.findMany({
      where: { isActive: true, featured: true, products: { some: { status: "ACTIVE", storeIndustry: "GENERAL" } } },
      include: { image: true, _count: { select: { products: { where: { status: "ACTIVE", storeIndustry: "GENERAL" } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 8,
    }),
  ]);
  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const activeFaqs = content.faqs.filter((faq) => faq.enabled);
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionProps = (id: HomepageSectionId) => ({ hidden: sectionState.get(id) === false });

  return <main className="flex flex-col overflow-hidden bg-[#f6f7f9] pb-[66px] lg:pb-0">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} /></section>

    <section {...sectionProps("PROMISES")} className="border-y border-[#eceef1] bg-white py-5">
      <div className={`${container} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>{[
        { icon: Truck, title: "ارسال مطمئن", text: "ارسال قابل پیگیری سفارش" },
        { icon: ShieldCheck, title: "پرداخت امن", text: "پرداخت از درگاه معتبر" },
        { icon: RefreshCcw, title: "خرید آسوده", text: "فرایند روشن ثبت سفارش" },
        { icon: Headphones, title: "پشتیبانی", text: "همراهی تا تحویل محصول" },
      ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 px-3 py-2"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"><Icon size={19} /></span><span><strong className="block text-sm text-[#242a35]">{title}</strong><small className="mt-1 block text-[#7b8290]">{text}</small></span></div>)}</div>
    </section>

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className="bg-[#f6f7f9] py-12 lg:py-16">
      <div className={container}><div className="mb-7 flex items-end justify-between"><div><span className="text-xs font-bold text-[var(--brand-primary)]">دسته‌بندی‌ها</span><h2 className="mb-0 mt-2 text-2xl font-black text-[#202631]">خرید براساس دسته‌بندی</h2></div><Link href="/products" className="text-sm font-bold text-[var(--brand-primary)]">مشاهده همه</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map((category) => <Link key={category.id} href={`/products?category=${category.slug}`} className="group overflow-hidden rounded-xl border border-[#e5e8ed] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative aspect-[4/3] bg-[#eef0f3]">{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" /> : <span className="grid h-full place-items-center text-[#a3a8b2]"><PackageCheck size={32} /></span>}</div><div className="flex items-center justify-between gap-3 p-4"><strong className="truncate text-sm text-[#242a35]">{category.name}</strong><small className="shrink-0 text-[#8a909b]">{category._count.products.toLocaleString("fa-IR")} محصول</small></div></Link>)}</div>
      </div>
    </section>}

    <section {...sectionProps("PRODUCTS")} className="bg-white py-12 lg:py-16"><div className={container}><div className="mb-2"><span className="text-xs font-bold text-[var(--brand-primary)]">تازه‌های فروشگاه</span><h2 className="mb-0 mt-2 text-2xl font-black text-[#202631]">محصولات جدید</h2></div><HomepageProductFeed initialFeed={productFeed} industry="GENERAL" /></div></section>

    <section {...sectionProps("ABOUT")} className="bg-[#f6f7f9] py-12 lg:py-20"><div className={`${container} grid gap-8 rounded-2xl bg-[var(--brand-primary)] px-6 py-10 text-[var(--brand-primary-foreground)] lg:grid-cols-[1fr_auto] lg:items-center lg:px-12`}><div><span className="text-xs font-bold opacity-75">خرید آنلاین از {settings.storeName}</span><h2 className="mb-3 mt-2 text-3xl font-black">انتخاب ساده، خرید مطمئن</h2><p className="m-0 max-w-2xl text-sm leading-8 opacity-80">محصولات موردنیاز خود را با اطلاعات روشن، موجودی به‌روز و قیمت مشخص انتخاب کنید و سفارش را آنلاین ثبت کنید.</p></div><Link href="/products" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-7 text-sm font-bold text-[var(--brand-primary)]">مشاهده محصولات</Link></div></section>

    {activeFaqs.length > 0 && <section {...sectionProps("CONCIERGE")} id="faq" className="bg-white py-12 lg:py-20"><div className={container}><div className="mx-auto mb-8 max-w-xl text-center"><span className="text-xs font-bold text-[var(--brand-primary)]">راهنمای خرید</span><h2 className="mb-3 mt-2 text-3xl font-black text-[#222]">سوالات متداول</h2><p className="m-0 text-sm leading-8 text-[#777]">پاسخ پرسش‌های پرتکرار درباره سفارش، پرداخت و تحویل.</p></div><StorefrontFaqAccordion faqs={activeFaqs} /></div></section>}
  </main>;
}
