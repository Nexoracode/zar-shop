import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, PackageCheck, ReceiptText, Truck } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { StorefrontHeroSlider, type StorefrontHeroSlide } from "@/components/storefront-hero-slider";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { StorefrontLicenses } from "@/components/storefront-licenses";
import { db } from "@/lib/db";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId, type HomepageTreasureCardId } from "@/modules/settings/homepage-settings";

type HomeCategory = Prisma.CategoryGetPayload<{ include: { image: true; children: true; _count: { select: { products: true } } } }>;

export const dynamic = "force-dynamic";
const container = "mx-auto w-[min(1440px,calc(100%-32px))] lg:w-[min(1440px,calc(100%-80px))]";

export default async function Home() {
  const settings = await getGeneralStoreSettings();
  const [productFeed, homepageCategories, homepage, contentSettings] = await Promise.all([
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    db.category.findMany({
      where: { isActive: true, featured: true },
      include: { image: true, children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getHomepageSettings(),
    getContentSettings(),
  ]);

  const categories = homepageCategories;
  const desktopHeroImage = homepage.heroDesktopMedia?.url ?? "/images/zar-hero-campaign.png";
  const configuredHeroSlides: StorefrontHeroSlide[] = homepage.heroSlides.flatMap((slide) => slide.desktopMedia ? [{
    id: slide.id,
    href: slide.href,
    desktop: { src: slide.desktopMedia.url, alt: slide.desktopMedia.alt ?? homepage.heroTitle },
    mobile: slide.mobileMedia ? { src: slide.mobileMedia.url, alt: slide.mobileMedia.alt ?? homepage.heroTitle } : undefined,
  }] : []);
  const heroSlides: StorefrontHeroSlide[] = configuredHeroSlides.length ? configuredHeroSlides : [{ id: "fallback", href: homepage.heroButtonHref, desktop: { src: desktopHeroImage, alt: homepage.heroDesktopMedia?.alt ?? homepage.heroTitle }, mobile: homepage.heroMobileMedia ? { src: homepage.heroMobileMedia.url, alt: homepage.heroMobileMedia.alt ?? homepage.heroTitle } : undefined }];
  const activeFaqs = contentSettings.faqs.filter((faq) => faq.enabled);
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionProps = (id: HomepageSectionId) => ({ hidden: sectionState.get(id) === false });
  const categoryImage = (category: HomeCategory | undefined) => category?.image?.type === "IMAGE" ? category.image.url : "/images/zar-hero-campaign.png";
  const treasureItems: Array<{ id: HomepageTreasureCardId; title: string; subtitle: string; query: string }> = [
    { id: "UNDER_20", title: "کمتر از ۲۰ میلیون تومان", subtitle: "محصولات مینیمال", query: "sortby=newest&MaxPrice=20000000" },
    { id: "FROM_20_TO_60", title: "۲۰ تا ۶۰ میلیون تومان", subtitle: "محصولات روزانه", query: "sortby=newest&MinPrice=20000000&MaxPrice=60000000" },
    { id: "FROM_60_TO_100", title: "۶۰ تا ۱۰۰ میلیون تومان", subtitle: "محصولات ویژه", query: "sortby=newest&MinPrice=60000000&MaxPrice=100000000" },
    { id: "OVER_100", title: "بالاتر از ۱۰۰ میلیون تومان", subtitle: "محصولات لوکس", query: "sortby=newest&MinPrice=100000000" },
  ];
  const treasureMedia = new Map(homepage.treasureCards.map((card) => [card.id, card.media]));

  return <main className="flex flex-col overflow-hidden bg-[#f7f4f2] pb-[66px] lg:pb-0">
    <section {...sectionProps("HERO")} className="bg-white">
      <StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} />
    </section>

    {categories.length > 0 && <section {...sectionProps("CATEGORIES")} className="bg-white py-5 lg:py-[60px]" aria-label="دسته‌بندی محصولات">
      <div className={`${container} grid grid-cols-1 gap-4 lg:grid-cols-5`}>
        {categories.map((category, index) => <Link key={category.id} href={`/products?category=${category.slug}`} className="group relative h-[350px] overflow-hidden rounded-[7px] bg-[#e8e2dc] lg:h-[286px]">
          <Image src={categoryImage(category)} alt={category.name} fill sizes="(max-width:1024px) 100vw, 25vw" className={`object-cover transition duration-500 group-hover:scale-[1.03] ${category.image?.type === "IMAGE" ? "" : index % 2 ? "object-left" : "object-right"}`} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <strong className="absolute inset-x-0 bottom-4 text-center text-base text-white">{category.name}</strong>
        </Link>)}
      </div>
    </section>}

    <section {...sectionProps("PRODUCTS")} className="bg-white py-[30px] lg:py-[60px]" aria-labelledby="latest-products">
      <div className={container}>
        <HomepageProductFeed initialFeed={productFeed} />
      </div>
    </section>

    <section {...sectionProps("ABOUT")} className="bg-white py-5 lg:py-[60px]">
      <div className={`${container} grid min-h-[340px] items-center gap-8 lg:grid-cols-[1.15fr_.85fr]`}>
        <div><h2 className="mb-4 mt-0 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#171717]">گنجینه {settings.storeName}</h2><p className="max-w-[700px] text-base leading-9 text-[#555] lg:text-lg lg:leading-10">طلای لوکس، دیگر دور از دسترس نیست. با انتخاب محصولات متنوع فروشگاه می‌توانید متناسب با هر میزان بودجه، برای خرید طلای دلخواهتان قدم بردارید و از قیمت‌گذاری شفاف و نرخ لحظه‌ای بهره‌مند شوید.</p><Link href="/products" className="mt-3 inline-flex h-12 min-w-48 items-center justify-center rounded-[7px] bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">شروع سرمایه‌گذاری</Link></div>
        <div className="relative min-h-[280px] overflow-hidden"><Image src="/images/treasure.png" alt={`گنجینه ${settings.storeName}`} fill sizes="(max-width:1024px) 100vw, 40vw" className="object-contain object-center lg:object-left" /></div>
      </div>

      <div className={`${container} mt-10 grid gap-0 overflow-hidden rounded-[7px] sm:grid-cols-2 lg:grid-cols-4`} aria-label="خرید بر اساس بودجه">
        {treasureItems.map(({ id, title, subtitle, query }, index) => <Link key={id} href={`/products?${query}`} className="group relative h-[280px] overflow-hidden lg:h-[400px]"><Image src={treasureMedia.get(id)?.url ?? categoryImage(categories[index])} alt={treasureMedia.get(id)?.alt ?? title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className={`object-cover transition duration-500 group-hover:scale-105 ${index % 2 ? "object-left" : "object-right"}`} /><span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><span className="absolute inset-x-5 bottom-6 text-white"><strong className="block text-base">{title}</strong><small className="mt-1 block text-white/80">{subtitle}</small></span></Link>)}
      </div>

      <div className={`${container} mt-[120px]`}>
        <div className="mb-8 max-w-2xl"><span className="text-xs font-bold text-[var(--brand-primary)]">انتخابی متناسب با شما</span><h2 className="mb-3 mt-2 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#171717]">خرید بر اساس هدف</h2><p className="m-0 text-sm leading-8 text-[#666]">چه برای یک هدیه ماندگار، چه برای استفاده روزمره یا حفظ ارزش سرمایه؛ مسیر مناسب خودتان را انتخاب کنید.</p></div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-[1.15fr_.85fr] lg:grid-rows-2 lg:overflow-visible lg:pb-0">
          <Link href="/products?sortby=newest&MinPrice=100000000" className="group relative h-[460px] min-w-[88%] snap-start overflow-hidden rounded-[7px] bg-[#ddd] sm:min-w-[70%] lg:row-span-2 lg:h-auto lg:min-h-[520px] lg:min-w-0"><Image src="/12f3e11e-a338-4785-adaa-4dc8fa285326.jpg" alt="طلای مناسب سرمایه‌گذاری" fill sizes="(max-width:1024px) 88vw, 58vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" /><span className="absolute inset-x-6 bottom-7 text-white lg:inset-x-9 lg:bottom-9"><small className="inline-flex rounded-[4px] bg-white/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur">حفظ ارزش دارایی</small><strong className="mt-3 block text-2xl font-black lg:text-3xl">سرمایه‌گذاری هوشمند</strong><span className="mt-2 block max-w-md text-xs leading-7 text-white/80">انتخاب طلاهای ارزشمند برای یک سرمایه‌گذاری ماندگار و قابل‌اعتماد.</span><span className="mt-5 inline-flex border-b border-white pb-1 text-xs font-bold">مشاهده محصولات</span></span></Link>
          <Link href="/products?sortby=popular" className="group relative h-[300px] min-w-[78%] snap-start overflow-hidden rounded-[7px] bg-[#ddd] sm:min-w-[55%] lg:h-auto lg:min-h-[252px] lg:min-w-0"><Image src="/c736ff52-0322-457f-b879-369202976d66.jpg" alt="طلای مناسب هدیه" fill sizes="(max-width:1024px) 78vw, 42vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" /><span className="absolute inset-x-6 bottom-6 text-white"><small className="text-[10px] font-bold text-white/75">برای لحظه‌های به‌یادماندنی</small><strong className="mt-1 block text-xl font-black">هدیه‌ای ماندگار</strong><span className="mt-3 inline-flex border-b border-white pb-1 text-[11px] font-bold">انتخاب هدیه</span></span></Link>
          <Link href="/products?sortby=price-asc&MaxPrice=60000000" className="group relative h-[300px] min-w-[78%] snap-start overflow-hidden rounded-[7px] bg-[#ddd] sm:min-w-[55%] lg:h-auto lg:min-h-[252px] lg:min-w-0"><Image src="/a1ef1413-c10d-49f5-905a-f6bff8e8bd09.jpg" alt="طلای مناسب استفاده روزمره" fill sizes="(max-width:1024px) 78vw, 42vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" /><span className="absolute inset-x-6 bottom-6 text-white"><small className="text-[10px] font-bold text-white/75">سبک، ظریف و کاربردی</small><strong className="mt-1 block text-xl font-black">استایل روزمره</strong><span className="mt-3 inline-flex border-b border-white pb-1 text-[11px] font-bold">مشاهده انتخاب‌ها</span></span></Link>
        </div>
      </div>

    </section>

    <section {...sectionProps("PROMISES")} id="trust" className="bg-[#f7f4f2] py-12 lg:py-20">
      <div className={container}><div className="mb-9 text-center"><h2 className="m-0 text-2xl font-black">اعتماد، سرمایه‌ی {settings.storeName}</h2><p className="mt-2 text-xs text-[#777]">خریدی روشن، امن و قابل پیگیری</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        { icon: <BadgeCheck />, title: "ضمانت اصالت", text: "طلای ۱۸ عیار همراه با فاکتور رسمی" }, { icon: <ReceiptText />, title: "قیمت کاملاً شفاف", text: "نمایش وزن، اجرت، سود و مالیات" }, { icon: <Truck />, title: "ارسال امن", text: "بسته‌بندی مطمئن و قابل پیگیری" }, { icon: <PackageCheck />, title: "پشتیبانی سفارش", text: "همراه شما از انتخاب تا تحویل" },
      ].map(({ icon, title, text }) => <div key={title} className="rounded-[7px] border border-[#e2ded9] bg-white p-6"><span className="mb-5 block text-[var(--brand-primary)]">{icon}</span><strong className="block text-sm">{title}</strong><small className="mt-2 block leading-6 text-[#777]">{text}</small></div>)}</div></div>
    </section>

    <section {...sectionProps("CONCIERGE")} className="bg-white py-[60px]">
      <div className={container}><h2 className="mb-8 mt-0 text-2xl font-black">چرا {settings.storeName}؟</h2><div className="grid gap-x-12 gap-y-7 lg:grid-cols-2">{[
        ["چگونه می‌توانم از فروشگاه خرید کنم؟", "محصول دلخواه را انتخاب کنید، مشخصات قیمت را ببینید و سفارش را به‌صورت آنلاین ثبت کنید."], ["قیمت طلا چگونه محاسبه می‌شود؟", "قیمت محصولات بر اساس نرخ لحظه‌ای طلا و مشخصات دقیق وزن، اجرت، سود و مالیات محاسبه می‌شود."], ["آیا محصولات فاکتور رسمی دارند؟", "تمام محصولات همراه با فاکتور رسمی و اطلاعات کامل فروشنده و خریدار تحویل می‌شوند."], ["ارسال سفارش چگونه انجام می‌شود؟", "سفارش‌ها با بسته‌بندی امن ارسال می‌شوند و وضعیت آن‌ها از حساب کاربری قابل پیگیری است."],
      ].map(([title, text]) => <article key={title} className="border-b border-[#ddd] pb-6"><h3 className="mb-2 mt-0 text-base font-bold">{title}</h3><p className="m-0 text-xs leading-7 text-[#666]">{text}</p></article>)}</div></div>

      {activeFaqs.length > 0 && <div id="faq" className={`${container} mt-[90px]`}><div className="mx-auto mb-9 max-w-xl text-center"><span className="text-xs font-bold text-[var(--brand-primary)]">راهنمای خرید</span><h2 className="mb-3 mt-2 text-3xl font-black text-[#222]">سوالات متداول</h2><p className="m-0 text-sm leading-8 text-[#777]">پاسخ پرسش‌های پرتکرار درباره سفارش، پرداخت و تحویل.</p></div><StorefrontFaqAccordion faqs={activeFaqs} /></div>}

      <StorefrontLicenses storeName={settings.storeName} />
    </section>
  </main>;
}
