import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gem, PackageCheck, ReceiptText, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings, type HomepageSectionId } from "@/modules/settings/homepage-settings";

type HomeProduct = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;
type HomeCategory = Prisma.CategoryGetPayload<{ include: { image: true; children: true; _count: { select: { products: true } } } }>;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gold, products, rootCategories, settings, homepage] = await Promise.all([
    getGoldPriceForDisplay(),
    db.product.findMany({
      where: { status: "ACTIVE" },
      include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
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
    getGeneralStoreSettings(),
    getHomepageSettings(),
  ]);
  const price = gold ? Number(gold.pricePerGram18) : null;
  const featuredCategories = rootCategories.filter((category) => category.featured);
  const homeCategories = (featuredCategories.length ? featuredCategories : rootCategories).slice(0, 4);
  const sectionPosition = new Map(homepage.sections.map((section, index) => [section.id, { enabled: section.enabled, order: index }]));
  const sectionProps = (id: HomepageSectionId) => ({
    hidden: sectionPosition.get(id)?.enabled === false,
    style: { order: sectionPosition.get(id)?.order ?? homepage.sections.length },
  });
  const desktopHeroImage = homepage.heroDesktopMedia?.url ?? "/images/zar-hero-campaign.png";

  return (
    <main className="flex flex-col overflow-hidden">
      <section {...sectionProps("HERO")} className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-[#c8b39f] sm:min-h-[680px] lg:min-h-[calc(100svh-160px)] lg:max-h-[820px]" aria-labelledby="hero-title">
        {homepage.heroMobileMedia && <Image
          src={homepage.heroMobileMedia.url}
          alt={homepage.heroMobileMedia.alt ?? homepage.heroTitle}
          fill
          priority
          sizes="100vw"
          className="object-cover sm:hidden"
        />}
        <Image
          src={desktopHeroImage}
          alt={homepage.heroDesktopMedia?.alt ?? `محصولات منتخب ${settings.storeName}`}
          fill
          priority
          sizes="100vw"
          className={`object-cover object-[63%_center] sm:object-[60%_center] lg:object-center ${homepage.heroMobileMedia ? "hidden sm:block" : ""}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,29,51,0.88)_0%,rgba(16,29,51,0.58)_48%,rgba(16,29,51,0.08)_80%)] max-lg:bg-[linear-gradient(0deg,rgba(16,29,51,0.92)_0%,rgba(16,29,51,0.5)_52%,rgba(16,29,51,0.08)_100%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] items-end px-5 pb-14 pt-56 sm:px-8 sm:pb-20 lg:items-center lg:px-6 lg:py-20">
          <div className="max-w-[610px] text-white">
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#ead39f] sm:text-sm"><i className="h-px w-8 bg-[#d7b66e]" /> کالکشن امضای زر · ۱۴۰۵</span>
            <h1 id="hero-title" className="m-0 max-w-3xl text-[clamp(2.55rem,7vw,5.5rem)] font-normal leading-[1.25] tracking-[-0.04em]">{homepage.heroTitle}</h1>
            <p className="mb-0 mt-5 max-w-[540px] text-sm leading-8 text-white/80 sm:text-base sm:leading-9">{homepage.heroDescription}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5 sm:mt-10">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#b5904c] px-6 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#9f7938]" href={homepage.heroButtonHref}>{homepage.heroButtonLabel} <ArrowLeft size={17} /></Link>
              <Link className="border-b border-white/50 pb-1 text-sm text-white transition hover:border-white" href="#about">قصه {settings.storeName}</Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-7 z-10 hidden rotate-180 text-[0.65rem] tracking-[0.24em] text-white/55 [writing-mode:vertical-rl] lg:block" aria-hidden="true">ZAR · FINE GOLD</div>
      </section>

      {/* Promises */}
      <section {...sectionProps("PROMISES")} className="border-b border-[#e5dfd4] bg-white" aria-label={`مزایای خرید از ${settings.storeName}`}>
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto min-h-[104px] grid grid-cols-3 items-center max-[760px]:grid-cols-1 max-[760px]:py-2">
          {[
            { icon: <Gem size={19} strokeWidth={1.4} />, title: "طلای ۱۸ عیار", sub: "تضمین اصالت هر قطعه" },
            { icon: <ReceiptText size={19} strokeWidth={1.4} />, title: "قیمت کاملاً شفاف", sub: "وزن، اجرت و مالیات مشخص" },
            { icon: <Truck size={19} strokeWidth={1.4} />, title: "ارسال امن و ویژه", sub: "بسته‌بندی درخور یک هدیه" },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="min-h-[52px] flex items-center justify-center gap-[14px] border-l border-[#e5dfd4] last:border-l-0 max-[760px]:min-h-[78px] max-[760px]:justify-start max-[760px]:border-l-0 max-[760px]:border-b max-[760px]:last:border-b-0">
              <span className="text-[#a67b39]">{icon}</span>
              <span className="grid text-[#858079] text-[0.68rem] leading-[1.65]">
                <strong className="text-[#152740] text-[0.82rem] font-semibold">{title}</strong>
                {sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section {...sectionProps("CATEGORIES")} className="py-[112px] max-[760px]:py-[76px]" aria-labelledby="category-title">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto">
          <div className="flex items-end justify-between gap-8 mb-[46px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:mb-[34px]">
            <div>
              <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">جهان زر</span>
              <h2 id="category-title" className="mt-[5px] mb-0 text-[#152740] text-[clamp(2rem,3.6vw,3.2rem)] font-normal tracking-[-0.035em] leading-[1.35]">انتخابی به وسعت سلیقه شما</h2>
            </div>
            <p className="w-[min(340px,100%)] m-0 text-[#7d7a74] text-[0.84rem]">هر قطعه، ترکیبی از ظرافت معاصر و ارزش ماندگار طلاست.</p>
          </div>

          {homeCategories.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 lg:grid-cols-4 lg:gap-4">
            {homeCategories.map((category: HomeCategory, index) => {
              const subtitle = category.description || category.children.slice(0, 3).map((child) => child.name).join(" · ") || `${category._count.products.toLocaleString("fa-IR")} محصول`;
              return (
                <Link href={`/products?category=${category.slug}`} className="group grid gap-3 text-right sm:gap-[18px]" key={category.id}>
                  <span className="relative block aspect-[0.82/1] overflow-hidden bg-[linear-gradient(155deg,#dfd4c7,#f2ece5)] text-[#8d672f]">
                    {category.image?.type === "IMAGE" ? (
                      <Image src={category.image.url} alt={category.image.alt ?? category.name} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
                    ) : (
                      <span className="absolute left-1/2 top-[46%] z-[2] -translate-x-1/2 -translate-y-1/2 opacity-[0.62]"><Gem size={35} strokeWidth={1} /></span>
                    )}
                    <span className="absolute right-3 top-3 z-[3] text-[0.68rem] tracking-[0.12em] text-[#152740]/55 sm:right-5 sm:top-5">{(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span>
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#101d33]/35 to-transparent" />
                    <span className="absolute left-[18px] bottom-[18px] w-[39px] h-[39px] grid place-items-center rounded-full bg-white/78 text-[#142640] translate-x-2 opacity-0 transition-all duration-[250ms] group-hover:translate-x-0 group-hover:opacity-100 max-[760px]:opacity-100 max-[760px]:translate-x-0">
                      <ArrowLeft size={18} />
                    </span>
                  </span>
                  <span className="grid gap-[2px] px-1">
                    <strong className="text-[#172840] text-[1.02rem] font-semibold max-[480px]:text-[0.9rem]">{category.name}</strong>
                    <small className="text-[#8b8780] text-[0.69rem] max-[480px]:hidden">{subtitle}</small>
                  </span>
                </Link>
              );
            })}
          </div>
          ) : (
            <div className="border border-dashed border-[#d9d4cb] py-12 text-center text-sm text-[#747982]">دسته‌بندی‌های فروشگاه به‌زودی نمایش داده می‌شوند.</div>
          )}
        </div>
      </section>

      {/* Products */}
      <section {...sectionProps("PRODUCTS")} className="py-[112px] bg-[#f0ede7] max-[760px]:py-[76px]">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto">
          <div className="flex items-end justify-between gap-8 mb-[42px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:mb-[34px]">
            <div>
              <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">منتخب این هفته</span>
              <h2 className="mt-[5px] mb-0 text-[#152740] text-[clamp(2rem,3.6vw,3.2rem)] font-normal tracking-[-0.035em]">قطعه‌هایی برای همیشه</h2>
            </div>
            <div className="grid justify-items-end gap-[13px] max-[760px]:justify-items-start">
              <p className="w-[min(340px,100%)] m-0 text-[#7d7a74] text-[0.84rem]">قیمت نهایی هر محصول با نرخ لحظه‌ای امروز محاسبه می‌شود.</p>
              <Link className="pb-1 border-b border-[#a9987d] inline-flex items-center gap-[7px] text-[#26364d] text-[0.78rem]" href="/products">
                مشاهده همه محصولات <ArrowLeft size={15} />
              </Link>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 justify-start gap-[18px_10px] sm:grid-cols-[repeat(auto-fit,minmax(190px,230px))] sm:gap-[24px_16px]">
              {products.map((product: HomeProduct) => {
                const calculated = price === null ? null : calculateProductPrice({
                  goldPricePerGram18: price, weightGrams: Number(product.weightGrams), purity: product.purity,
                  makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue),
                  profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent),
                });
                const baseAmount = product.fixedPrice ? Number(product.fixedPrice) : calculated?.total ?? null;
                const discounted = baseAmount === null ? null : calculateDiscountedPrice(baseAmount, product);
                const media = product.media[0]?.media;
                return (
                  <ProductCard
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
                  />
                );
              })}
            </div>
          ) : (
            <div className="min-h-[310px] grid place-items-center content-center gap-2 text-center bg-[#f8f6f1] border border-[#e2ddd4]">
              <Gem size={38} className="text-[#a67b39]" />
              <h3 className="mt-[5px] mb-0 text-[#172840] text-[1.45rem] font-medium">کالکشن تازه در راه است</h3>
              <p className="m-0 mb-3 text-[#817d76] text-[0.8rem]">به‌زودی محصولات جدید {settings.storeName} را اینجا خواهید دید.</p>
              <Link className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm" href="/products">مشاهده فروشگاه</Link>
            </div>
          )}
        </div>
      </section>

      {/* About / Editorial */}
      <section {...sectionProps("ABOUT")} id="about" className="w-[min(1320px,calc(100%-48px))] mx-auto my-[116px] min-h-[590px] grid grid-cols-[0.9fr_1.1fr] bg-[#142640] max-[760px]:my-[76px] max-[760px]:grid-cols-1">
        <div className="min-h-[590px] relative grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_51%_48%,rgba(236,210,159,0.22),transparent_29%),linear-gradient(145deg,#c7b79f,#e8dfd2)] text-[#15304c] max-[760px]:min-h-[360px]" aria-hidden="true">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[Georgia,serif] text-[17rem] opacity-20 text-white">Z</span>
          <span className="absolute border border-[rgba(155,111,45,0.48)] rounded-full w-[47%] aspect-square" />
          <span className="absolute border border-white/55 rounded-full w-[63%] aspect-square" />
          <span className="relative z-[3] text-[#9a6e2d]"><Gem size={84} strokeWidth={1} /></span>
          <small className="absolute right-[53px] bottom-[47px] font-[Georgia,serif] text-[0.62rem] tracking-[0.18em]">۱۸K · FINE GOLD</small>
        </div>

        <div className="p-[clamp(52px,7vw,100px)] text-white self-center max-[760px]:p-7 max-[760px]:pb-[55px]">
          <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">فلسفه {settings.storeName}</span>
          <h2 className="mt-[6px] mb-5 text-[clamp(2.7rem,4.5vw,4.6rem)] font-normal leading-[1.3]">
            زیبایی امروز،<br />ارزش ماندگار فردا
          </h2>
          <p className="max-w-[560px] text-white/66 text-[0.9rem] leading-[2.15]">
            ما باور داریم خرید طلا باید به اندازه خود آن ارزشمند باشد. برای همین، مشخصات وزن، عیار، اجرت، سود و مالیات هر قطعه را شفاف نمایش می‌دهیم تا انتخاب شما با آرامش و اطمینان همراه باشد.
          </p>
          <div className="my-[34px] py-[22px] grid grid-cols-3 border-y border-white/13 gap-2 max-[480px]:gap-2">
            {[["۱۸K", "عیار تضمین‌شده"], ["۱۰۰٪", "فاکتور رسمی"], ["۲۴/۷", "قیمت‌گذاری آنلاین"]].map(([val, label]) => (
              <span key={val} className="grid">
                <strong className="text-[#e6c485] font-[Georgia,serif] text-[1.15rem]">{val}</strong>
                <span className="text-white/52 text-[0.66rem]">{label}</span>
              </span>
            ))}
          </div>
          <Link className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center gap-[9px] border border-white/40 rounded-sm text-white transition-all hover:border-[#d9b876]" href="/products">
            کشف دنیای زر <ArrowLeft size={17} />
          </Link>
        </div>
      </section>

      {/* Concierge */}
      <section {...sectionProps("CONCIERGE")} id="guide" className="py-[105px] border-t border-[#e5dfd4] bg-[#fbfaf7] max-[760px]:py-[76px]">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto grid grid-cols-[0.8fr_1.2fr] gap-[clamp(55px,8vw,120px)] items-start max-[1000px]:grid-cols-1">
          <div>
            <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">خدمات اختصاصی</span>
            <h2 className="mt-[5px] mb-4 text-[#152740] text-[clamp(2rem,3.5vw,3.1rem)] font-normal leading-[1.4]">آرامش، از انتخاب تا تحویل</h2>
            <p className="text-[#7e7b75] text-[0.82rem]">تیم زر در تمام مسیر خرید کنار شماست؛ از انتخاب هدیه تا پیگیری سفارش.</p>
          </div>
          <div className="grid grid-cols-3 gap-5 max-[760px]:grid-cols-1">
            {[
              { icon: <ShieldCheck strokeWidth={1.3} />, title: "تضمین اصالت", desc: "طلای ۱۸ عیار با مشخصات دقیق و قابل استناد" },
              { icon: <PackageCheck strokeWidth={1.3} />, title: "تحویل قابل پیگیری", desc: "ارسال امن و مشاهده وضعیت در حساب کاربری" },
              { icon: <Sparkles strokeWidth={1.3} />, title: "مشاوره انتخاب", desc: "همراهی برای انتخاب قطعه مناسب شما یا هدیه" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="min-h-[205px] p-[30px_24px] flex flex-col items-start border border-[#dfd9cf] bg-white max-[760px]:min-h-auto">
                <span className="mb-[30px] text-[#a67b39]">{icon}</span>
                <strong className="mb-[6px] text-[#172840] text-[0.9rem]">{title}</strong>
                <span className="text-[#88837b] text-[0.68rem] leading-[1.8]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
