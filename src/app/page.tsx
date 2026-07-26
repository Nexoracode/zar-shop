import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gem, PackageCheck, ReceiptText, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

type HomeProduct = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;

const categories = [
  ["انگشتر", "جزئیاتی برای هر روز", "ring", "۰۱"],
  ["گردنبند", "درخشش نزدیک به قلب", "necklace", "۰۲"],
  ["دستبند", "امضای ظریف دستان شما", "bracelet", "۰۳"],
  ["گوشواره", "قاب درخشان چهره", "earring", "۰۴"],
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gold, products] = await Promise.all([
    getGoldPrice(),
    db.product.findMany({
      where: { status: "ACTIVE" },
      include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
  ]);
  const price = Number(gold.pricePerGram18);

  return (
    <main className="home-page">
      <section className="campaign-hero" aria-labelledby="hero-title">
        <Image
          src="/images/zar-hero-campaign.png"
          alt="مدل با گردنبند، گوشواره و دستبند طلای زر گالری"
          fill
          priority
          sizes="100vw"
        />
        <div className="campaign-shade" />
        <div className="container campaign-content">
          <div className="campaign-copy">
            <span className="hero-kicker"><i /> کالکشن امضای زر · ۱۴۰۵</span>
            <h1 id="hero-title">طلا، روایتِ<br /><em>ماندگارِ شما</em></h1>
            <p>زیورآلاتی برای لحظه‌هایی که می‌مانند؛ با طراحی اصیل، قیمت‌گذاری شفاف و تضمین همیشگی اصالت.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/products">مشاهده کالکشن <ArrowLeft size={17} /></Link>
              <Link className="hero-secondary-link" href="#about">قصه زر گالری</Link>
            </div>
          </div>
        </div>

        <div className="absolute z-[2] right-[28px] bottom-[34px] text-[rgba(19,38,64,0.65)] text-[0.65rem] tracking-[0.24em] [writing-mode:vertical-rl] rotate-180 font-[Georgia,serif] max-[760px]:hidden" aria-hidden="true">ZAR · FINE GOLD</div>
      </section>

      {/* Promises */}
      <section className="border-b border-[#e5dfd4] bg-white" aria-label="مزایای خرید از زر گالری">
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
      <section className="py-[112px] max-[760px]:py-[76px]" aria-labelledby="category-title">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto">
          <div className="flex items-end justify-between gap-8 mb-[46px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:mb-[34px]">
            <div>
              <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">جهان زر</span>
              <h2 id="category-title" className="mt-[5px] mb-0 text-[#152740] text-[clamp(2rem,3.6vw,3.2rem)] font-normal tracking-[-0.035em] leading-[1.35]">انتخابی به وسعت سلیقه شما</h2>
            </div>
            <p className="w-[min(340px,100%)] m-0 text-[#7d7a74] text-[0.84rem]">هر قطعه، ترکیبی از ظرافت معاصر و ارزش ماندگار طلاست.</p>
          </div>

          <div className="grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[1000px]:gap-[30px_16px] max-[760px]:gap-[25px_10px]">
            {categories.map(([title, subtitle, kind, number]) => {
              const bgMap: Record<string, string> = {
                ring: "bg-[linear-gradient(155deg,#e4d1bc,#f1eae1)]",
                necklace: "bg-[linear-gradient(155deg,#e4d1bc,#f1eae1)]",
                bracelet: "bg-[linear-gradient(155deg,#d7dfda,#eef1ed)]",
                earring: "bg-[linear-gradient(155deg,#d8dce0,#f0f1f2)]",
              };
              return (
                <Link href="/products" className="group grid gap-[18px] text-right" key={kind}>
                  <span className={`block aspect-[0.82/1] relative overflow-hidden ${bgMap[kind] ?? "bg-[#e8dfd2]"} text-[#8d672f]`}>
                    <span className="absolute top-5 right-5 text-[rgba(21,39,64,0.52)] text-[0.72rem] font-[Georgia,serif] tracking-[0.12em]">{number}</span>
                    <span className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] opacity-[0.62]"><Gem size={35} strokeWidth={1} /></span>
                    <span className="absolute left-[18px] bottom-[18px] w-[39px] h-[39px] grid place-items-center rounded-full bg-white/78 text-[#142640] translate-x-2 opacity-0 transition-all duration-[250ms] group-hover:translate-x-0 group-hover:opacity-100 max-[760px]:opacity-100 max-[760px]:translate-x-0">
                      <ArrowLeft size={18} />
                    </span>
                  </span>
                  <span className="grid gap-[2px] px-1">
                    <strong className="text-[#172840] text-[1.02rem] font-semibold max-[480px]:text-[0.9rem]">{title}</strong>
                    <small className="text-[#8b8780] text-[0.69rem] max-[480px]:hidden">{subtitle}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-[112px] bg-[#f0ede7] max-[760px]:py-[76px]">
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
            <div className="grid grid-cols-4 gap-[28px_16px] max-[1000px]:grid-cols-3 max-[760px]:grid-cols-2 max-[760px]:gap-[18px_10px]">
              {products.map((product: HomeProduct) => {
                const calculated = calculateProductPrice({
                  goldPricePerGram18: price, weightGrams: Number(product.weightGrams), purity: product.purity,
                  makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue),
                  profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent),
                });
                const media = product.media[0]?.media;
                return (
                  <ProductCard
                    key={product.id}
                    href={`/products/${product.slug}`}
                    name={product.name}
                    category={product.category?.name ?? "طلا"}
                    weight={Number(product.weightGrams)}
                    purity={product.purity}
                    price={formatMoney(product.fixedPrice?.toString() ?? calculated.total)}
                    image={media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="min-h-[310px] grid place-items-center content-center gap-2 text-center bg-[#f8f6f1] border border-[#e2ddd4]">
              <Gem size={38} className="text-[#a67b39]" />
              <h3 className="mt-[5px] mb-0 text-[#172840] text-[1.45rem] font-medium">کالکشن تازه در راه است</h3>
              <p className="m-0 mb-3 text-[#817d76] text-[0.8rem]">به‌زودی قطعه‌های جدید زر گالری را اینجا خواهید دید.</p>
              <Link className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[#1c3155] text-white border border-[#1c3155] rounded-sm" href="/products">مشاهده فروشگاه</Link>
            </div>
          )}
        </div>
      </section>

      {/* About / Editorial */}
      <section id="about" className="w-[min(1320px,calc(100%-48px))] mx-auto my-[116px] min-h-[590px] grid grid-cols-[0.9fr_1.1fr] bg-[#142640] max-[760px]:my-[76px] max-[760px]:grid-cols-1">
        <div className="min-h-[590px] relative grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_51%_48%,rgba(236,210,159,0.22),transparent_29%),linear-gradient(145deg,#c7b79f,#e8dfd2)] text-[#15304c] max-[760px]:min-h-[360px]" aria-hidden="true">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[Georgia,serif] text-[17rem] opacity-20 text-white">Z</span>
          <span className="absolute border border-[rgba(155,111,45,0.48)] rounded-full w-[47%] aspect-square" />
          <span className="absolute border border-white/55 rounded-full w-[63%] aspect-square" />
          <span className="relative z-[3] text-[#9a6e2d]"><Gem size={84} strokeWidth={1} /></span>
          <small className="absolute right-[53px] bottom-[47px] font-[Georgia,serif] text-[0.62rem] tracking-[0.18em]">۱۸K · FINE GOLD</small>
        </div>

        <div className="p-[clamp(52px,7vw,100px)] text-white self-center max-[760px]:p-7 max-[760px]:pb-[55px]">
          <span className="inline-block text-[#9a6e2d] text-[0.78rem] font-bold tracking-[0.08em] mb-[5px]">فلسفه زر گالری</span>
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
      <section id="guide" className="py-[105px] border-t border-[#e5dfd4] bg-[#fbfaf7] max-[760px]:py-[76px]">
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
