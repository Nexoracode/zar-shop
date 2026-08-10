import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, Dumbbell, HeartPulse, House, Laptop, Shirt, ShoppingBag, Smartphone, Sparkles } from "lucide-react";
import { DragScrollRow } from "@/components/drag-scroll-row";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { HomepageBestSellers } from "@/components/homepage-best-sellers";
import { ProductCard } from "@/components/product-card";
import { StorefrontHeroSlider } from "@/components/storefront-hero-slider";
import { StorefrontImageTiles } from "@/components/storefront-image-tiles";
import { ViewAllProductCard } from "@/components/view-all-product-card";
import { db } from "@/lib/db";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getHomepageSettings, type HomepageLayoutItemId } from "@/modules/settings/homepage-settings";
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

export async function GeneralHome() {
  const [homepage, latestFeed, popularFeed, categories] = await Promise.all([
    getHomepageSettings(),
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    getStorefrontProductFeed({ sort: "POPULAR", page: 1, pageSize: 12 }),
    db.category.findMany({
      where: { parentId: null, isActive: true, products: { some: { status: "ACTIVE", storeIndustry: "GENERAL" } } },
      include: { image: true, _count: { select: { products: { where: { status: "ACTIVE", storeIndustry: "GENERAL" } } } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 10,
    }),
  ]);

  const heroSlides = buildStorefrontHeroSlides(homepage, "/images/zar-hero-campaign.png");
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionOrder = new Map(homepage.sections.map((section, index) => [section.id, index]));
  const sectionProps = (id: HomepageLayoutItemId) => ({ hidden: sectionState.get(id) === false, style: { order: sectionOrder.get(id) ?? homepage.sections.length } });
  const discountedProducts = latestFeed.items.filter((product) => product.originalPrice);

  return <main className="flex flex-col gap-4 overflow-hidden bg-[#f4f5f7] pb-[78px] pt-3 lg:gap-6 lg:pb-8">
    <section {...sectionProps("HERO")} className="bg-white"><StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} /></section>

    {homepage.tileGroups.map((group) => group.tiles.some((tile) => tile.media) && <section key={group.id} {...sectionProps(`TILE_GROUP:${group.id}`)} className={container} aria-label="پیشنهادهای تصویری"><StorefrontImageTiles groups={[group]} /></section>)}

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className={`${container} rounded-2xl bg-white px-3 py-6 sm:px-6 lg:py-8`} aria-label="دسته‌بندی محصولات">
      <div className="mb-6 flex items-center justify-between"><h2 className="m-0 text-lg font-black text-[#232934] sm:text-xl">خرید بر اساس دسته‌بندی</h2><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">همه کالاها<ChevronLeft size={15} /></Link></div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-5 lg:grid-cols-10">{categories.map((category, index) => {
        const Icon = resolveCategoryIcon(`${category.name} ${category.slug}`);
        return <Link key={category.id} href={`/products?category=${category.slug}`} className="group grid min-w-0 justify-items-center gap-2.5 text-center"><span className={`relative grid aspect-square w-full max-w-[112px] place-items-center overflow-hidden rounded-full ${categoryTones[index % categoryTones.length]} transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>{category.image?.type === "IMAGE" ? <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" /> : <><span className="absolute -left-4 -top-4 size-14 rounded-full bg-white/50" /><Icon size={38} strokeWidth={1.4} /></>}</span><span className="w-full truncate text-xs font-bold text-[#3d4450]">{category.name}</span><small className="-mt-1 text-[10px] text-[#9298a2]">{category._count.products.toLocaleString("fa-IR")} کالا</small></Link>;
      })}</div>
    </section>}

    {discountedProducts.length > 0 && <section {...sectionProps("FEATURED_PRODUCTS")} className={`${container} overflow-hidden rounded-2xl bg-[var(--brand-primary)] p-3 text-[var(--brand-primary-foreground)] sm:p-4 lg:p-5`} aria-label="پیشنهادهای ویژه">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-center">
        <div className="grid justify-items-center gap-3 px-3 py-3 text-center text-white"><Sparkles size={42} strokeWidth={1.4} /><strong className="text-2xl font-black leading-9">پیشنهاد<br />شگفت‌انگیز</strong><Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold">مشاهده همه<ChevronLeft size={15} /></Link></div>
        <DragScrollRow ariaLabel="پیشنهادهای شگفت‌انگیز" showNavigation className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {discountedProducts.map((product, index) => <div key={product.id} className="w-[calc(50%-2px)] min-w-[calc(50%-2px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ProductCard {...product} storefrontVariant="gallery" imageTone={index % 4} /></div>)}
          <div className="w-[calc(50%-2px)] min-w-[calc(50%-2px)] snap-start sm:w-[220px] sm:min-w-[220px] lg:w-[224px] lg:min-w-[224px]"><ViewAllProductCard href="/products" /></div>
        </DragScrollRow>
      </div>
    </section>}

    {popularFeed.items.length > 0 && <div {...sectionProps("POPULAR_PRODUCTS")} className={container}><HomepageBestSellers products={popularFeed.items} /></div>}

    <section {...sectionProps("LATEST_PRODUCTS")} className={`${container} min-w-0 overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white px-4 py-6 sm:px-6 lg:px-7 lg:py-8`}><div className="mb-5"><h2 className="m-0 text-xl font-black text-[#232934] sm:text-2xl">جدیدترین محصولات</h2><p className="mb-0 mt-1 text-xs text-[#858b95] sm:text-sm">تازه‌ترین کالاهای اضافه‌شده به فروشگاه</p></div><HomepageProductFeed initialFeed={latestFeed} industry="GENERAL" /></section>

  </main>;
}
