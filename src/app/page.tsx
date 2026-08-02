import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Gem, PackageCheck, ReceiptText, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { HomepageProductFeed } from "@/components/homepage-product-feed";
import { StorefrontHeroSlider, type StorefrontHeroSlide } from "@/components/storefront-hero-slider";
import { StorefrontFaqAccordion } from "@/components/storefront-faq-accordion";
import { db } from "@/lib/db";
import { getStorefrontProductFeed } from "@/modules/products/storefront-feed";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId, type HomepageTreasureCardId } from "@/modules/settings/homepage-settings";

type HomeCategory = Prisma.CategoryGetPayload<{ include: { image: true; children: true; _count: { select: { products: true } } } }>;

export const dynamic = "force-dynamic";
const container = "mx-auto w-[min(1184px,calc(100%-32px))] lg:w-[min(1184px,calc(100%-80px))]";

export default async function Home() {
  const settings = await getGeneralStoreSettings();
  const [productFeed, rootCategories, homepage, contentSettings] = await Promise.all([
    getStorefrontProductFeed({ sort: "LATEST", page: 1 }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      include: { image: true, children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 10,
    }),
    getHomepageSettings(),
    getContentSettings(),
  ]);

  const featuredCategories = rootCategories.filter((category) => category.featured);
  const categories = (featuredCategories.length ? featuredCategories : rootCategories).slice(0, 5);
  const desktopHeroImage = homepage.heroDesktopMedia?.url ?? "/images/zar-hero-campaign.png";
  const activeFaqs = contentSettings.faqs.filter((faq) => faq.enabled);
  const sectionState = new Map(homepage.sections.map((section) => [section.id, section.enabled]));
  const sectionProps = (id: HomepageSectionId) => ({ hidden: sectionState.get(id) === false });
  const categoryImage = (category: HomeCategory | undefined) => category?.image?.type === "IMAGE" ? category.image.url : "/images/zar-hero-campaign.png";
  const configuredHeroSlides: StorefrontHeroSlide[] = homepage.heroSlides.flatMap((slide) => slide.desktopMedia ? [{
    id: slide.id,
    desktop: { src: slide.desktopMedia.url, alt: slide.desktopMedia.alt ?? homepage.heroTitle },
    mobile: slide.mobileMedia ? { src: slide.mobileMedia.url, alt: slide.mobileMedia.alt ?? homepage.heroTitle } : undefined,
  }] : []);
  const heroSlides: StorefrontHeroSlide[] = configuredHeroSlides.length ? configuredHeroSlides : [{ id: "fallback", desktop: { src: desktopHeroImage, alt: homepage.heroDesktopMedia?.alt ?? homepage.heroTitle }, mobile: homepage.heroMobileMedia ? { src: homepage.heroMobileMedia.url, alt: homepage.heroMobileMedia.alt ?? homepage.heroTitle } : undefined }];
  const storySource = [
    ...productFeed.items.map((product) => ({ title: product.name, href: product.href, image: product.image?.src ?? "/images/zar-hero-campaign.png" })),
    ...rootCategories.map((category) => ({ title: category.name, href: `/products?category=${category.slug}`, image: categoryImage(category) })),
  ].slice(0, 10);
  const stories = storySource.length ? Array.from({ length: 10 }, (_, index) => storySource[index % storySource.length]) : [];
  const treasureItems: Array<{ id: HomepageTreasureCardId; title: string; subtitle: string; query: string }> = [
    { id: "UNDER_20", title: "کمتر از ۲۰ میلیون تومان", subtitle: "محصولات مینیمال", query: "sortby=newest&MaxPrice=20000000" },
    { id: "FROM_20_TO_60", title: "۲۰ تا ۶۰ میلیون تومان", subtitle: "محصولات روزانه", query: "sortby=newest&MinPrice=20000000&MaxPrice=60000000" },
    { id: "FROM_60_TO_100", title: "۶۰ تا ۱۰۰ میلیون تومان", subtitle: "محصولات ویژه", query: "sortby=newest&MinPrice=60000000&MaxPrice=100000000" },
    { id: "OVER_100", title: "بالاتر از ۱۰۰ میلیون تومان", subtitle: "محصولات لوکس", query: "sortby=newest&MinPrice=100000000" },
  ];
  const treasureMedia = new Map(homepage.treasureCards.map((card) => [card.id, card.media]));

  return <main className="flex flex-col overflow-hidden bg-[#f7f4f2] pb-[66px] lg:pb-0">
    <section {...sectionProps("HERO")} className="bg-white">
      <div className="flex h-[93px] items-center gap-3 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:h-[153px] lg:gap-4 lg:px-4" aria-label="تازه‌های فروشگاه">
        {stories.length ? stories.map((story, index) => <Link href={story.href} key={`${story.href}-${story.title}-${index}`} className="group relative aspect-square h-[76px] shrink-0 rounded-full border-[3px] border-[var(--brand-primary)] p-[3px] lg:h-[102px]">
          <span className="relative block size-full overflow-hidden rounded-full bg-[#eee9e5]"><Image src={story.image} alt={story.title} fill sizes="102px" loading="eager" style={{ objectPosition: `${20 + (index % 5) * 15}% center` }} className="object-cover transition duration-300 group-hover:scale-105" /></span>
        </Link>) : Array.from({ length: 9 }, (_, index) => <span key={index} className="grid aspect-square h-[76px] shrink-0 place-items-center rounded-full border-[3px] border-[var(--brand-primary)] bg-[#f1ede8] text-[var(--brand-accent)] lg:h-[102px]"><Gem size={28} strokeWidth={1} /></span>)}
      </div>

      <StorefrontHeroSlider slides={heroSlides} contentMode={homepage.heroContentMode} title={homepage.heroTitle} description={homepage.heroDescription} buttonLabel={homepage.heroButtonLabel} buttonHref={homepage.heroButtonHref} />
    </section>

    <section {...sectionProps("CATEGORIES")} className="bg-white py-5 lg:py-[60px]" aria-label="دسته‌بندی محصولات">
      <div className={`${container} grid grid-cols-1 gap-4 lg:grid-cols-4`}>
        {categories.length ? categories.map((category, index) => <Link key={category.id} href={`/products?category=${category.slug}`} className="group relative h-[350px] overflow-hidden rounded-[7px] bg-[#e8e2dc] lg:h-[286px]">
          <Image src={categoryImage(category)} alt={category.name} fill sizes="(max-width:1024px) 100vw, 25vw" className={`object-cover transition duration-500 group-hover:scale-[1.03] ${category.image?.type === "IMAGE" ? "" : index % 2 ? "object-left" : "object-right"}`} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <strong className="absolute inset-x-0 bottom-4 text-center text-base text-white">{category.name}</strong>
        </Link>) : Array.from({ length: 5 }, (_, index) => <Link key={index} href="/products" className="relative h-[350px] overflow-hidden rounded-[7px] bg-[#e8e2dc] lg:h-[286px]"><Image src={desktopHeroImage} alt="محصولات طلا" fill sizes="(max-width:1024px) 100vw, 25vw" className={index % 2 ? "object-cover object-left" : "object-cover object-right"} /><span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" /><strong className="absolute inset-x-0 bottom-4 text-center text-white">محصولات طلا</strong></Link>)}
      </div>
    </section>

    <section {...sectionProps("PRODUCTS")} className="bg-white py-[30px] lg:py-[60px]" aria-labelledby="latest-products">
      <div className={container}>
        <HomepageProductFeed initialFeed={productFeed} />
      </div>
    </section>

    <section {...sectionProps("ABOUT")} className="bg-white py-5 lg:py-[60px]">
      <div className={`${container} grid min-h-[340px] items-center gap-8 lg:grid-cols-[1.15fr_.85fr]`}>
        <div><h2 className="mb-4 mt-0 text-[clamp(1.7rem,3vw,2.4rem)] font-black text-[#171717]">گنجینه {settings.storeName}</h2><p className="max-w-[700px] text-sm leading-9 text-[#555]">طلای لوکس، دیگر دور از دسترس نیست. با انتخاب محصولات متنوع فروشگاه می‌توانید متناسب با هر میزان بودجه، برای خرید طلای دلخواهتان قدم بردارید و از قیمت‌گذاری شفاف و نرخ لحظه‌ای بهره‌مند شوید.</p><Link href="/products" className="mt-3 inline-flex h-12 min-w-48 items-center justify-center rounded-[7px] bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">شروع خرید</Link></div>
        <div className="relative min-h-[280px] overflow-hidden"><Image src="/images/zar-hero-campaign.png" alt={`گنجینه ${settings.storeName}`} fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover object-left [mask-image:linear-gradient(to_right,black_70%,transparent)]" /></div>
      </div>

      <div className={`${container} mt-10 grid gap-0 overflow-hidden rounded-[7px] sm:grid-cols-2 lg:grid-cols-4`} aria-label="خرید بر اساس بودجه">
        {treasureItems.map(({ id, title, subtitle, query }, index) => <Link key={id} href={`/products?${query}`} className="group relative h-[280px] overflow-hidden lg:h-[400px]"><Image src={treasureMedia.get(id)?.url ?? categoryImage(categories[index])} alt={treasureMedia.get(id)?.alt ?? title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className={`object-cover transition duration-500 group-hover:scale-105 ${index % 2 ? "object-left" : "object-right"}`} /><span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><span className="absolute inset-x-5 bottom-6 text-white"><strong className="block text-base">{title}</strong><small className="mt-1 block text-white/80">{subtitle}</small></span></Link>)}
      </div>

      <div className={`${container} mt-[120px] grid gap-3 lg:grid-cols-3`}>
        {[["پربازدیدهای این هفته", "انتخاب‌های محبوب مشتریان", "/products", categories[0]], ["بهترین‌های کالکشن", "جواهری همراه با درخشش", "/products", categories[1]], ["درخشش نهایی استایل شما", "محصولات کاربردی برای هر روز", "/products", categories[2]]].map(([title, sub, href, category]) => <Link key={String(title)} href={String(href)} className="grid min-h-[220px] overflow-hidden rounded-[7px] border border-[#ddd] bg-white sm:grid-cols-2"><span className="relative min-h-[200px]"><Image src={categoryImage(category as HomeCategory | undefined)} alt={String(title)} fill sizes="(max-width:1024px) 100vw, 17vw" className="object-cover" /></span><span className="flex flex-col justify-center p-6"><strong className="text-xl leading-8">{String(title)}</strong><small className="mt-3 leading-6 text-[#666]">{String(sub)}</small><span className="mt-5 inline-flex w-fit rounded-[5px] bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-[var(--brand-primary-foreground)]">مشاهده و خرید</span></span></Link>)}
      </div>

      <div className={`${container} mt-[120px]`}><div className="mb-8 flex items-center justify-between"><h2 className="m-0 text-2xl font-black">مجموعه طرح‌های بین‌المللی</h2><Link href="/products" className="border-b-2 border-[var(--brand-primary)] pb-1 text-xs font-bold text-[var(--brand-primary)]">مشاهده بیشتر</Link></div><div className="flex gap-8 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{rootCategories.map((category) => <Link key={category.id} href={`/products?category=${category.slug}`} className="grid min-w-24 justify-items-center gap-3"><span className="relative size-24 overflow-hidden rounded-full border border-[#ddd] bg-[#f3efeb]"><Image src={categoryImage(category)} alt={category.name} fill sizes="96px" className="object-cover" /></span><strong className="text-xs">{category.name}</strong></Link>)}</div></div>
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

      {activeFaqs.length > 0 && <div id="faq" className={`${container} mt-[90px] grid gap-10 lg:grid-cols-[280px_1fr]`}><div><span className="text-xs font-bold text-[var(--brand-primary)]">راهنمای خرید</span><h2 className="mb-3 mt-2 text-2xl font-black">سوالات متداول</h2><p className="text-xs leading-7 text-[#777]">پاسخ پرسش‌های پرتکرار درباره سفارش، پرداخت و تحویل.</p></div><StorefrontFaqAccordion faqs={activeFaqs} /></div>}

      <div className="mt-[90px] bg-[#fdf8f1] py-[60px]"><div className={`${container} grid gap-8 lg:grid-cols-[280px_1fr]`}><div><h2 className="m-0 text-2xl font-black">مجوزها و ضمانت خرید</h2></div><div className="grid gap-3 sm:grid-cols-3">{[["مجوز فعالیت", <ShieldCheck key="a" />], ["فاکتور رسمی", <ReceiptText key="b" />], ["تضمین اصالت", <Sparkles key="c" />]].map(([title, icon]) => <div key={String(title)} className="rounded-[7px] border border-[#eadfce] bg-white p-5 text-center"><span className="mx-auto mb-3 block w-fit text-[var(--brand-primary)]">{icon}</span><strong className="text-sm">{String(title)}</strong></div>)}</div></div></div>
    </section>
  </main>;
}
