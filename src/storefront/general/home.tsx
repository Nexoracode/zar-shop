import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, Dumbbell, Headphones, HeartPulse, House, Laptop, RefreshCcw, ShieldCheck, Shirt, ShoppingBag, Smartphone, Sparkles, Truck } from "lucide-react";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { ProductCard } from "@/components/product-card";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import { db } from "@/lib/db";
import type { StorefrontProductCardItem } from "@/modules/products/storefront-feed-contract";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId } from "@/modules/settings/homepage-settings";
import { buildStorefrontHeroSlides } from "@/storefront/shared/hero";

const container = "mx-auto w-[min(1440px,calc(100%-24px))] sm:w-[min(1440px,calc(100%-40px))] lg:w-[min(1440px,calc(100%-64px))]";
const categoryTones = ["bg-rose-50 text-rose-500", "bg-blue-50 text-blue-600", "bg-amber-50 text-amber-600", "bg-emerald-50 text-emerald-600", "bg-violet-50 text-violet-600", "bg-cyan-50 text-cyan-600"];

function resolveCategoryIcon(value: string): LucideIcon {
  const name = value.toLowerCase();
  if (name.includes("موبایل")) return Smartphone;
  if (name.includes("دیجیتال")) return Laptop;
  if (name.includes("خانه") || name.includes("آشپزخانه")) return House;
  if (name.includes("پوشاک") || name.includes("مد")) return Shirt;
  if (name.includes("ورزش") || name.includes("سفر")) return Dumbbell;
  if (name.includes("زیبایی") || name.includes("سلامت")) return HeartPulse;
  return ShoppingBag;
}

function ProductRail({ title, eyebrow, products, href = "/products" }: { title: string; eyebrow: string; products: StorefrontProductCardItem[]; href?: string }) {
  if (!products.length) return null;
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
    <div className="mb-5"><span className="text-[11px] font-bold text-[var(--brand-primary)]">{eyebrow}</span><h2 className="mb-0 mt-1.5 text-xl font-black text-[#232934] sm:text-2xl">{title}</h2></div>
    <DragScrollRow ariaLabel={title} className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product, index) => <div key={product.id} className="w-[164px] min-w-[164px] sm:w-[206px] sm:min-w-[206px] lg:w-[218px] lg:min-w-[218px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}
      <div className="w-[164px] min-w-[164px] sm:w-[206px] sm:min-w-[206px] lg:w-[218px] lg:min-w-[218px]"><ViewAllProductCard href={href} /></div>
    </DragScrollRow>
  </section>;
}

export async function GeneralHome() {
  const [settings, homepage, content, latestFeed, popularFeed, categories] = await Promise.all([
    getGeneralStoreSettings(),
    getHomepageSettings(),
    getContentSettings(),
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    getStorefrontProductFeed({ sort: "POPULAR", page: 1 }),
    db.category.findMany({
      where: { parentId: null, isActive: true, products: { some: { status: "ACTIVE", storeIndustry: "GENERAL" } } },
      include: { image: true, _count: { select: { products: { where: { status: "ACTIVE", storeIndustry: "GENERAL" } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 10,
    }),
  ]);

  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const activeFaqs = content.faqs.filter((faq) => faq.enabled);
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionProps = (id: HomepageSectionId) => ({ hidden: sectionState.get(id) === false });
  const discountedProducts = latestFeed.items.filter((product) => product.originalPrice);
  const promoMedia = homepage.treasureCards.map((card) => card.media);
  const promoCategories = categories.slice(0, 4);

  return <main className="flex flex-col gap-4 overflow-hidden bg-[#f4f5f7] pb-[78px] pt-3 lg:gap-6 lg:pb-8">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} /></section>

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className={`${container} rounded-2xl bg-white px-3 py-6 sm:px-6 lg:py-8`} aria-label="دسته‌بندی محصولات">
      <div className="mb-6 flex items-center justify-between"><h2 className="m-0 text-lg font-black text-[#232934] sm:text-xl">خرید بر اساس دسته‌بندی</h2><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">همه کالاها<ChevronLeft size={15} /></Link></div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-5 lg:grid-cols-10">{categories.map((category, index) => {
        const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
        return <Link key={category.id} href={`/products?category=${category.slug}`} className="group grid min-w-0 justify-items-center gap-2.5 text-center"><span className={`relative grid aspect-square w-full max-w-[112px] place-items-center overflow-hidden rounded-full ${categoryTones[index % categoryTones.length]} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" /> : <><span className="absolute -left-4 -top-4 size-14 rounded-full bg-white/50" /><Icon size={38} strokeWidth={1.4} /></>}</span><span className="w-full truncate text-xs font-bold text-[#3d4450]">{category.name}</span><small className="-mt-1 text-[10px] text-[#9298a2]">{category._count.products.toLocaleString("fa-IR")} کالا</small></Link>;
      })}</div>
    </section>}

    {discountedProducts.length > 0 && <section {...sectionProps("PRODUCTS")} className={`${container} overflow-hidden rounded-2xl bg-[var(--brand-primary)] p-3 text-[var(--brand-primary-foreground)] sm:p-4 lg:p-5`} aria-label="پیشنهادهای ویژه">
      <div className="grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-center"><div className="grid justify-items-center gap-3 px-3 py-3 text-center text-white"><Sparkles size={42} strokeWidth={1.4} /><strong className="text-2xl font-black leading-9">پیشنهاد<br />شگفت‌انگیز</strong><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold">مشاهده همه<ChevronLeft size={15} /></Link></div><DragScrollRow ariaLabel="پیشنهادهای شگفت‌انگیز" className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{discountedProducts.map((product, index) => <div key={product.id} className="w-[166px] min-w-[166px] overflow-hidden rounded-xl bg-white p-2 sm:w-[210px] sm:min-w-[210px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}</DragScrollRow></div>
    </section>}

    {promoCategories.length > 0 && <section {...sectionProps("ABOUT")} className={`${container} grid grid-cols-2 gap-3 lg:grid-cols-4`} aria-label="پیشنهادهای دسته‌بندی">{promoCategories.map((category, index) => {
      const media = promoMedia[index];
      const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
      return <Link key={category.id} href={`/products?category=${category.slug}`} className={`group relative min-h-[170px] overflow-hidden rounded-2xl p-5 sm:min-h-[210px] ${categoryTones[index % categoryTones.length]}`}>{media?.url || category.image?.url ? <Image src={media?.url ?? category.image!.url} alt={media?.alt ?? category.image?.alt ?? category.name} fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" /> : <><span className="absolute -bottom-10 -left-8 size-36 rounded-full bg-white/45" /><Icon className="absolute bottom-5 left-5 opacity-80 transition group-hover:-translate-y-1" size={58} strokeWidth={1.2} /></>}<span className={`absolute inset-0 ${media?.url || category.image?.url ? "bg-gradient-to-t from-black/65 via-black/5 to-transparent" : ""}`} /><span className="absolute inset-x-5 bottom-5"><strong className={`block text-base font-black sm:text-xl ${media?.url || category.image?.url ? "text-white" : ""}`}>{category.name}</strong><small className={`mt-1 block ${media?.url || category.image?.url ? "text-white/80" : "opacity-70"}`}>مشاهده و خرید محصولات</small></span></Link>;
    })}</section>}

    <section {...sectionProps("PRODUCTS")} className={`${container} grid min-w-0 gap-4 lg:gap-6`}><ProductRail title="محبوب‌ترین کالاها" eyebrow="انتخاب مشتریان" products={popularFeed.items} href="/products?sortby=popular" /><div className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8"><div className="mb-2"><span className="text-[11px] font-bold text-[var(--brand-primary)]">تازه‌های فروشگاه</span><h2 className="mb-0 mt-1.5 text-xl font-black text-[#232934] sm:text-2xl">جدیدترین محصولات</h2></div><HomepageProductFeed initialFeed={latestFeed} industry="GENERAL" /></div></section>

    <section {...sectionProps("PROMISES")} className={`${container} rounded-2xl border border-[#e6e8ec] bg-white px-4 py-5 sm:px-6`}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { icon: Truck, title: "ارسال قابل پیگیری", text: "وضعیت سفارش همیشه مشخص است" },
      { icon: ShieldCheck, title: "پرداخت امن", text: "اتصال به درگاه‌های معتبر" },
      { icon: RefreshCcw, title: "خرید مطمئن", text: "اطلاعات و موجودی به‌روز" },
      { icon: Headphones, title: "پشتیبانی فروشگاه", text: settings.supportPhone || "همراه شما تا تحویل سفارش" },
    ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 rounded-xl bg-[#f8f9fa] px-4 py-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--brand-primary)] shadow-sm"><Icon size={20} /></span><span className="min-w-0"><strong className="block text-sm text-[#303641]">{title}</strong><small className="mt-1 block truncate text-[11px] text-[#858b95]">{text}</small></span></div>)}</div></section>

    <section className={`${container} overflow-hidden rounded-2xl bg-[var(--brand-primary)] px-6 py-8 text-[var(--brand-primary-foreground)] sm:px-9 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:px-12`}><div><span className="text-xs font-bold opacity-70">فروشگاه آنلاین {settings.storeName}</span><h2 className="mb-3 mt-2 text-2xl font-black sm:text-3xl">هر چیزی که نیاز داری، یک‌جا پیدا کن</h2><p className="m-0 max-w-2xl text-sm leading-8 opacity-80">از کالاهای دیجیتال تا خانه، پوشاک، زیبایی و ورزش؛ محصولات را با قیمت شفاف و موجودی به‌روز مقایسه و انتخاب کنید.</p></div><Link href="/products" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-7 text-sm font-bold text-[var(--brand-primary)] lg:mt-0">شروع خرید</Link></section>

    {activeFaqs.length > 0 && <section {...sectionProps("CONCIERGE")} id="faq" className={`${container} rounded-2xl bg-white px-4 py-10 sm:px-8 lg:px-12 lg:py-14`}><div className="mx-auto mb-8 max-w-xl text-center"><span className="text-xs font-bold text-[var(--brand-primary)]">راهنمای خرید</span><h2 className="mb-3 mt-2 text-2xl font-black text-[#232934] sm:text-3xl">سوالات متداول</h2><p className="m-0 text-sm leading-8 text-[#777]">پاسخ پرسش‌های پرتکرار درباره سفارش، پرداخت و تحویل.</p></div><StorefrontFaqAccordion faqs={activeFaqs} /></section>}
  </main>;
}
