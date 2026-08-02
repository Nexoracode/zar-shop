import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Gem,
  Headphones,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { calculateProductPrice } from "@/modules/products/pricing";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId } from "@/modules/settings/homepage-settings";

type HomeProduct = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;
type HomeCategory = Prisma.CategoryGetPayload<{ include: { image: true; children: true; _count: { select: { products: true } } } }>;

export const dynamic = "force-dynamic";

const containerClass = "mx-auto w-[min(1240px,calc(100%-40px))]";

export default async function Home() {
  const [settings, catalogSettings] = await Promise.all([getGeneralStoreSettings(), getCatalogSettings()]);
  const productWhere = { status: "ACTIVE" as const, ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}) };
  const [gold, products, rootCategories, homepage, contentSettings] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.product.findMany({
      where: productWhere,
      include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        image: true,
        children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 8,
    }),
    getHomepageSettings(),
    getContentSettings(),
  ]);

  const goldPrice = gold ? Number(gold.pricePerGram18) : null;
  const featuredCategories = rootCategories.filter((category) => category.featured);
  const homeCategories = (featuredCategories.length ? featuredCategories : rootCategories).slice(0, 5);
  const sectionPosition = new Map(homepage.sections.map((section, index) => [section.id, { enabled: section.enabled, order: index }]));
  const sectionProps = (id: HomepageSectionId) => ({
    hidden: sectionPosition.get(id)?.enabled === false,
    style: { order: sectionPosition.get(id)?.order ?? homepage.sections.length },
  });
  const desktopHeroImage = homepage.heroDesktopMedia?.url ?? "/images/zar-hero-campaign.png";
  const activeFaqs = contentSettings.faqs.filter((faq) => faq.enabled);

  const productCard = (product: HomeProduct) => {
    const calculated = goldPrice === null ? null : calculateProductPrice({
      goldPricePerGram18: goldPrice,
      weightGrams: Number(product.weightGrams),
      purity: product.purity,
      makingFeeType: product.makingFeeType,
      makingFeeValue: Number(product.makingFeeValue),
      profitPercent: Number(product.profitPercent),
      taxPercent: Number(product.taxPercent),
    });
    const baseAmount = product.fixedPrice ? Number(product.fixedPrice) : calculated?.total ?? null;
    const discounted = baseAmount === null ? null : calculateDiscountedPrice(baseAmount, product);
    const media = product.media[0]?.media;

    return <ProductCard
      key={product.id}
      href={`/products/${product.slug}`}
      name={product.name}
      industry={product.storeIndustry}
      category={product.category?.name ?? "طلا"}
      weight={Number(product.weightGrams)}
      purity={product.purity}
      price={discounted ? formatMoney(discounted.finalPrice, settings.currency) : "قیمت موقتاً در دسترس نیست"}
      originalPrice={discounted?.isActive ? formatMoney(discounted.originalPrice, settings.currency) : undefined}
      image={media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined}
      storefrontVariant="gallery"
    />;
  };

  return (
    <main className="flex flex-col overflow-hidden bg-white">
      <section
        {...sectionProps("HERO")}
        className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-[#c8b39f] sm:min-h-[680px] lg:min-h-[calc(100svh-160px)] lg:max-h-[820px]"
        aria-labelledby={homepage.heroContentMode === "WITH_CONTENT" ? "hero-title" : undefined}
        aria-label={homepage.heroContentMode === "IMAGE_ONLY" ? "بنر اصلی فروشگاه" : undefined}
      >
        {homepage.heroMobileMedia && <Image src={homepage.heroMobileMedia.url} alt={homepage.heroMobileMedia.alt ?? homepage.heroTitle} fill priority sizes="100vw" className="object-cover sm:hidden" />}
        <Image
          src={desktopHeroImage}
          alt={homepage.heroDesktopMedia?.alt ?? `محصولات منتخب ${settings.storeName}`}
          fill
          priority
          sizes="100vw"
          className={`object-cover object-[63%_center] sm:object-[60%_center] lg:object-center ${homepage.heroMobileMedia ? "hidden sm:block" : ""}`}
        />
        {homepage.heroContentMode === "IMAGE_ONLY" ? (
          <Link href={homepage.heroButtonHref} aria-label={`مشاهده ${homepage.heroTitle}`} className="absolute inset-0 z-10 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--brand-accent)]" />
        ) : <>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,29,51,0.88)_0%,rgba(16,29,51,0.58)_48%,rgba(16,29,51,0.08)_80%)] max-lg:bg-[linear-gradient(0deg,rgba(16,29,51,0.92)_0%,rgba(16,29,51,0.5)_52%,rgba(16,29,51,0.08)_100%)]" />
          <div className="relative z-10 mx-auto flex w-full max-w-[1240px] items-end px-5 pb-14 pt-56 sm:px-8 sm:pb-20 lg:items-center lg:px-6 lg:py-20">
            <div className="max-w-[610px] text-white">
              <span className="mb-4 inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#ead39f] sm:text-sm"><i className="h-px w-8 bg-[var(--brand-accent)]" /> کالکشن امضای زر · ۱۴۰۵</span>
              <h1 id="hero-title" className="m-0 max-w-3xl text-[clamp(2.55rem,7vw,5.5rem)] font-normal leading-[1.25] tracking-[-0.04em]">{homepage.heroTitle}</h1>
              <p className="mb-0 mt-5 max-w-[540px] text-sm leading-8 text-white/80 sm:text-base sm:leading-9">{homepage.heroDescription}</p>
              <div className="mt-8 flex flex-wrap items-center gap-5 sm:mt-10">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--brand-primary)] px-6 text-sm text-[var(--brand-primary-foreground)] transition hover:-translate-y-0.5 hover:brightness-110" href={homepage.heroButtonHref}>{homepage.heroButtonLabel}<ArrowLeft size={17} /></Link>
                <Link className="border-b border-white/50 pb-1 text-sm text-white transition hover:border-white" href="#about">قصه {settings.storeName}</Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-7 z-10 hidden rotate-180 text-[0.65rem] tracking-[0.24em] text-white/55 [writing-mode:vertical-rl] lg:block" aria-hidden="true">ZAR · FINE GOLD</div>
        </>}
      </section>

      <section {...sectionProps("CATEGORIES")} className="bg-white py-16 sm:py-20" aria-labelledby="category-title">
        <div className={containerClass}>
          <div className="mb-9 text-center">
            <span className="text-xs font-bold text-[var(--brand-accent)]">دسته‌بندی محصولات</span>
            <h2 id="category-title" className="mb-0 mt-2 text-[clamp(1.7rem,3.2vw,2.7rem)] font-normal text-[var(--brand-primary)]">آنچه برای درخشیدن می‌خواهید</h2>
          </div>
          {homeCategories.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {homeCategories.map((category: HomeCategory) => (
                <Link key={category.id} href={`/products?category=${category.slug}`} className="group relative aspect-[0.92/1] overflow-hidden rounded-[1.15rem] bg-[#eee9e2]">
                  {category.image?.type === "IMAGE" ? (
                    <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  ) : <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_42%,#fff_0_8%,transparent_9%),linear-gradient(145deg,#f7f2eb,#d9cbb9)] text-[var(--brand-accent)]"><Gem size={42} strokeWidth={1.1} /></span>}
                  <span className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/75 via-transparent to-transparent" />
                  <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2 text-white sm:inset-x-5 sm:bottom-5">
                    <span>
                      <strong className="block text-sm sm:text-base">{category.name}</strong>
                      <small className="text-[0.66rem] text-white/75">{category._count.products.toLocaleString("fa-IR")} محصول</small>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/90 text-[var(--brand-primary)] transition group-hover:-translate-x-1"><ArrowLeft size={16} /></span>
                  </span>
                </Link>
              ))}
            </div>
          ) : <div className="rounded-2xl border border-dashed border-[#d9d4cb] py-12 text-center text-sm text-[#747982]">دسته‌بندی‌های فروشگاه به‌زودی نمایش داده می‌شوند.</div>}
        </div>
      </section>

      <section {...sectionProps("PRODUCTS")} className="bg-[#f7f6f3] py-16 sm:py-24" aria-labelledby="products-title">
        <div className={containerClass}>
          <div className="mb-9 flex flex-col items-center gap-5 text-center sm:mb-12">
            <h2 id="products-title" className="m-0 text-[clamp(1.8rem,3.4vw,2.8rem)] font-normal text-[var(--brand-primary)]">محصولات منتخب</h2>
            <nav aria-label="فیلتر محصولات منتخب" className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-white p-1.5 shadow-[0_8px_30px_rgba(23,35,59,0.06)]">
              <Link href="/?sort=newest#products-title" className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-xs text-[var(--brand-primary-foreground)]">جدیدترین‌ها</Link>
              <Link href="/products?featured=true" className="rounded-full px-5 py-2 text-xs text-[#6f7480] transition hover:bg-[#f1eee8]">محبوب‌ترین‌ها</Link>
              <Link href="/products?sort=making-fee" className="rounded-full px-5 py-2 text-xs text-[#6f7480] transition hover:bg-[#f1eee8]">کم‌اجرت‌ها</Link>
            </nav>
          </div>
          {products.length ? (
            <div className="storefront-product-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map(productCard)}</div>
          ) : (
            <div className="grid min-h-[290px] place-items-center content-center gap-2 rounded-2xl border border-[#e2ddd4] bg-white text-center">
              <Gem size={38} className="text-[var(--brand-accent)]" />
              <h3 className="mb-0 mt-2 text-xl font-medium text-[var(--brand-primary)]">کالکشن تازه در راه است</h3>
              <p className="m-0 text-sm text-[#817d76]">به‌زودی محصولات جدید {settings.storeName} را اینجا خواهید دید.</p>
            </div>
          )}
          <div className="mt-10 text-center"><Link className="inline-flex items-center gap-2 border-b border-[var(--brand-accent)] pb-1 text-sm text-[var(--brand-primary)]" href="/products">مشاهده همه محصولات<ArrowLeft size={16} /></Link></div>

          <div className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="خرید بر اساس بودجه">
            {[
              ["تا ۲۰ میلیون تومان", "انتخاب‌های مینیمال", "MaxPrice=20000000"],
              ["۲۰ تا ۶۰ میلیون تومان", "برای استفاده روزمره", "MinPrice=20000000&MaxPrice=60000000"],
              ["۶۰ تا ۱۰۰ میلیون تومان", "هدیه‌ای ویژه", "MinPrice=60000000&MaxPrice=100000000"],
              ["بیشتر از ۱۰۰ میلیون", "کالکشن لوکس", "MinPrice=100000000"],
            ].map(([title, subtitle, query], index) => (
              <Link key={title} href={`/products?${query}`} className="group relative min-h-48 overflow-hidden rounded-2xl bg-[var(--brand-primary)] p-6 text-white">
                <span className="absolute -left-7 -top-9 size-36 rounded-full border border-white/15" />
                <span className="absolute -bottom-14 -right-7 size-44 rounded-full bg-[var(--brand-accent)]/20" />
                <small className="relative text-white/55">{(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</small>
                <span className="relative mt-10 block text-base font-bold">{title}</span>
                <span className="relative mt-1 block text-xs text-white/65">{subtitle}</span>
                <ArrowLeft className="absolute bottom-6 left-6 transition group-hover:-translate-x-1" size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section {...sectionProps("ABOUT")} id="about" className="bg-white py-16 sm:py-24">
        <div className={`${containerClass} grid gap-4 lg:grid-cols-3`}>
          {[
            { title: "پربازدیدهای این هفته", subtitle: "انتخاب‌هایی که بیشتر دیده شده‌اند", href: "/products?sort=most-viewed", category: homeCategories[0] },
            { title: "درخشش روزمره", subtitle: "ظریف، سبک و مناسب هر استایل", href: "/products?sort=newest", category: homeCategories[1] },
            { title: "هدیه‌ای ماندگار", subtitle: "برای لحظه‌هایی که تکرار نمی‌شوند", href: "/products?featured=true", category: homeCategories[2] },
          ].map(({ title, subtitle, href, category }) => (
            <Link key={title} href={href} className="group relative min-h-[420px] overflow-hidden rounded-[1.25rem] bg-[#e9e1d7]">
              {category?.image?.type === "IMAGE" ? <Image src={category.image.url} alt={title} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" /> : <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.9),transparent_18%),linear-gradient(145deg,#d9c9b5,#f1ece5)]" />}
              <span className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/90 via-[var(--brand-primary)]/5 to-transparent" />
              <span className="absolute inset-x-7 bottom-7 text-white">
                <strong className="block text-xl font-normal">{title}</strong>
                <small className="mt-1 block text-white/65">{subtitle}</small>
                <span className="mt-5 inline-flex items-center gap-2 text-xs">مشاهده و خرید<ArrowLeft size={15} /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section {...sectionProps("PROMISES")} className="border-y border-[#e6e1d9] bg-[#fbfaf7] py-12" aria-label={`مزایای خرید از ${settings.storeName}`}>
        <div className={`${containerClass} grid grid-cols-2 gap-y-8 lg:grid-cols-4`}>
          {[
            { icon: <BadgeCheck />, title: "ضمانت اصالت", sub: "طلای ۱۸ عیار و فاکتور رسمی" },
            { icon: <ReceiptText />, title: "قیمت شفاف", sub: "نمایش وزن، اجرت و مالیات" },
            { icon: <Truck />, title: "ارسال امن", sub: "بسته‌بندی مطمئن و قابل پیگیری" },
            { icon: <Headphones />, title: "پشتیبانی خرید", sub: "همراه شما از انتخاب تا تحویل" },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 border-l border-[#e1ddd5] px-3 last:border-0 sm:px-6">
              <span className="text-[var(--brand-accent)]">{icon}</span>
              <span><strong className="block text-sm text-[var(--brand-primary)]">{title}</strong><small className="text-[0.67rem] text-[#858079]">{sub}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section {...sectionProps("CONCIERGE")} id="guide" className="bg-white py-16 sm:py-24">
        <div className={`${containerClass} grid overflow-hidden rounded-[1.5rem] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] lg:grid-cols-[1.05fr_.95fr]`}>
          <div className="relative min-h-[360px] overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(236,210,159,0.24),transparent_25%),linear-gradient(145deg,#c7b79f,#e8dfd2)] text-[var(--brand-primary)]" aria-hidden="true">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-[Georgia,serif] text-[14rem] text-white/25">Z</span>
            <span className="absolute left-1/2 top-1/2 aspect-square w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--brand-accent)]/50" />
            <span className="absolute left-1/2 top-1/2 aspect-square w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
            <span className="absolute inset-0 grid place-items-center text-[var(--brand-accent)]"><Gem size={82} strokeWidth={1} /></span>
          </div>
          <div className="self-center p-8 text-white sm:p-14 lg:p-16">
            <span className="text-xs font-bold text-[var(--brand-accent)]">چرا {settings.storeName}؟</span>
            <h2 className="mb-5 mt-2 text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.35]">زیبایی امروز،<br />ارزش ماندگار فردا</h2>
            <p className="text-sm leading-8 text-white/65">خرید طلا باید به اندازه خود آن ارزشمند و مطمئن باشد. مشخصات هر قطعه را شفاف نمایش می‌دهیم و در تمام مسیر خرید کنار شما می‌مانیم.</p>
            <div className="my-8 grid grid-cols-3 gap-2 border-y border-white/15 py-5">
              {[["۱۸K", "عیار تضمین‌شده"], ["۱۰۰٪", "فاکتور رسمی"], ["۲۴/۷", "قیمت آنلاین"]].map(([value, label]) => <span key={value}><strong className="block text-lg text-[var(--brand-accent)]">{value}</strong><small className="text-[0.65rem] text-white/55">{label}</small></span>)}
            </div>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-sm transition hover:border-[var(--brand-accent)]" href="/products">شروع خرید<ArrowLeft size={16} /></Link>
          </div>
        </div>
        <div className={`${containerClass} mt-12 grid gap-4 sm:grid-cols-3`}>
          {[
            { icon: <ShieldCheck />, title: "اصالت قابل استناد", desc: "مشخصات دقیق هر قطعه و تضمین طلای ۱۸ عیار" },
            { icon: <PackageCheck />, title: "تحویل قابل پیگیری", desc: "ارسال امن و مشاهده وضعیت سفارش در حساب کاربری" },
            { icon: <Sparkles />, title: "مشاوره انتخاب", desc: "همراهی برای انتخاب محصول مناسب شما یا هدیه" },
          ].map(({ icon, title, desc }) => <div key={title} className="rounded-2xl border border-[#e1ddd5] bg-[#fbfaf7] p-6"><span className="mb-5 block text-[var(--brand-accent)]">{icon}</span><strong className="block text-sm text-[var(--brand-primary)]">{title}</strong><small className="mt-1 block leading-6 text-[#858079]">{desc}</small></div>)}
        </div>
      </section>

      {activeFaqs.length > 0 && <section id="faq" style={{ order: homepage.sections.length }} className="border-t border-[#e5dfd4] bg-[#f7f6f3] py-16 sm:py-24" aria-labelledby="faq-title">
        <div className="mx-auto grid w-[min(1000px,calc(100%-40px))] gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14">
          <div><span className="text-xs font-bold text-[var(--brand-accent)]">راهنمای خرید</span><h2 id="faq-title" className="mb-4 mt-2 text-[clamp(1.8rem,3.5vw,2.8rem)] font-normal leading-[1.4] text-[var(--brand-primary)]">سوالات متداول</h2><p className="m-0 text-sm leading-7 text-[#7e7b75]">پاسخ پرسش‌های پرتکرار درباره محصولات، سفارش و تحویل.</p></div>
          <StorefrontFaqAccordion faqs={activeFaqs} />
        </div>
      </section>}
    </main>
  );
}
