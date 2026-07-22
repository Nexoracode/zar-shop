import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Gem,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

type HomeProduct = Prisma.ProductGetPayload<{
  include: { category: true; media: { include: { media: true } } };
}>;

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
          src="/images/slider.png"
          alt="مدل با گردنبند، گوشواره و دستبند طلای زر گالری"
          fill
          priority
          sizes="100vw"
        />
        <div className="campaign-shade" />
        <div className="container campaign-content">
          {/* <div className="campaign-copy">
            <span className="hero-kicker"><i /> کالکشن امضای زر · ۱۴۰۵</span>
            <h1 id="hero-title">طلا، روایتِ<br /><em>ماندگارِ شما</em></h1>
            <p>زیورآلاتی برای لحظه‌هایی که می‌مانند؛ با طراحی اصیل، قیمت‌گذاری شفاف و تضمین همیشگی اصالت.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/products">مشاهده کالکشن <ArrowLeft size={17} /></Link>
              <Link className="hero-secondary-link" href="#about">قصه زر گالری</Link>
            </div>
          </div> */}
        </div>
        <div className="live-price-card">
          <span><span className="live-dot" /> نرخ لحظه‌ای هر گرم طلای ۱۸ عیار</span>
          <strong>{formatMoney(price)}</strong>
          <small>به‌روزرسانی خودکار قیمت‌ها</small>
        </div>
        <div className="hero-signature" aria-hidden="true">ZAR · FINE GOLD</div>
      </section>

      <section className="luxury-promises" aria-label="مزایای خرید از زر گالری">
        <div className="container luxury-promises-grid">
          <div><Gem size={19} /><span><strong>طلای ۱۸ عیار</strong>تضمین اصالت هر قطعه</span></div>
          <div><ReceiptText size={19} /><span><strong>قیمت کاملاً شفاف</strong>وزن، اجرت و مالیات مشخص</span></div>
          <div><Truck size={19} /><span><strong>ارسال امن و ویژه</strong>بسته‌بندی درخور یک هدیه</span></div>
        </div>
      </section>

      <section className="category-section container" aria-labelledby="category-title">
        <div className="home-title-row">
          <div>
            <span className="eyebrow">جهان زر</span>
            <h2 id="category-title">انتخابی به وسعت سلیقه شما</h2>
          </div>
          <p>هر قطعه، ترکیبی از ظرافت معاصر و ارزش ماندگار طلاست.</p>
        </div>
        <div className="category-grid">
          {categories.map(([title, subtitle, kind, number]) => (
            <Link href="/products" className="category-item" key={kind}>
              <span className={`category-visual category-${kind}`}>
                <span className="category-number">{number}</span>
                <span className="category-jewel"><Gem size={35} /></span>
                <span className="category-arrow"><ArrowLeft size={18} /></span>
              </span>
              <span className="category-copy"><strong>{title}</strong><small>{subtitle}</small></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section products-section">
        <div className="container">
          <div className="home-title-row products-title-row">
            <div><span className="eyebrow">منتخب این هفته</span><h2>قطعه‌هایی برای همیشه</h2></div>
            <div className="title-side"><p>قیمت نهایی هر محصول با نرخ لحظه‌ای امروز محاسبه می‌شود.</p><Link className="text-link" href="/products">مشاهده همه محصولات <ArrowLeft size={15} /></Link></div>
          </div>
          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((product: HomeProduct) => {
                const calculated = calculateProductPrice({
                  goldPricePerGram18: price,
                  weightGrams: Number(product.weightGrams),
                  purity: product.purity,
                  makingFeeType: product.makingFeeType,
                  makingFeeValue: Number(product.makingFeeValue),
                  profitPercent: Number(product.profitPercent),
                  taxPercent: Number(product.taxPercent),
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
            <div className="home-empty-products">
              <Gem size={38} />
              <h3>کالکشن تازه در راه است</h3>
              <p>به‌زودی قطعه‌های جدید زر گالری را اینجا خواهید دید.</p>
              <Link className="btn btn-primary" href="/products">مشاهده فروشگاه</Link>
            </div>
          )}
        </div>
      </section>

      <section id="about" className="editorial-section container">
        <div className="editorial-art" aria-hidden="true">
          <span className="editorial-monogram">Z</span>
          <span className="editorial-orbit orbit-one" />
          <span className="editorial-orbit orbit-two" />
          <span className="editorial-gem"><Gem size={84} strokeWidth={1} /></span>
          <small>۱۸K · FINE GOLD</small>
        </div>
        <div className="editorial-copy">
          <span className="eyebrow">فلسفه زر گالری</span>
          <h2>زیبایی امروز،<br />ارزش ماندگار فردا</h2>
          <p>ما باور داریم خرید طلا باید به اندازه خود آن ارزشمند باشد. برای همین، مشخصات وزن، عیار، اجرت، سود و مالیات هر قطعه را شفاف نمایش می‌دهیم تا انتخاب شما با آرامش و اطمینان همراه باشد.</p>
          <div className="editorial-facts">
            <span><strong>۱۸K</strong>عیار تضمین‌شده</span>
            <span><strong>۱۰۰٪</strong>فاکتور رسمی</span>
            <span><strong>۲۴/۷</strong>قیمت‌گذاری آنلاین</span>
          </div>
          <Link className="btn btn-outline-light" href="/products">کشف دنیای زر <ArrowLeft size={17} /></Link>
        </div>
      </section>

      <section id="guide" className="concierge-section">
        <div className="container concierge-grid">
          <div className="concierge-intro"><span className="eyebrow">خدمات اختصاصی</span><h2>آرامش، از انتخاب تا تحویل</h2><p>تیم زر در تمام مسیر خرید کنار شماست؛ از انتخاب هدیه تا پیگیری سفارش.</p></div>
          <div className="concierge-services">
            <div><ShieldCheck /><strong>تضمین اصالت</strong><span>طلای ۱۸ عیار با مشخصات دقیق و قابل استناد</span></div>
            <div><PackageCheck /><strong>تحویل قابل پیگیری</strong><span>ارسال امن و مشاهده وضعیت در حساب کاربری</span></div>
            <div><Sparkles /><strong>مشاوره انتخاب</strong><span>همراهی برای انتخاب قطعه مناسب شما یا هدیه</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
