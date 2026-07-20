import Image from "next/image";
import Link from "next/link";
import { Gem, PackageCheck, ReceiptText, RefreshCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
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
  ["انگشتر زنانه", "ring"],
  ["گردنبند زنانه", "necklace"],
  ["دستبند زنانه", "bracelet"],
  ["گوشواره زنانه", "earring"],
  ["هدیه‌های طلایی", "gift"],
  ["اکسسوری مردانه", "men"],
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
    <main>
      <section className="campaign-hero">
        <Image src="/images/zar-hero-campaign.png" alt="کمپین زیورآلات طلای زر گالری" fill priority sizes="100vw" />
        <div className="campaign-shade" />
        <div className="container campaign-content">
          <div className="campaign-copy">
            <span>کالکشن تازه زر</span>
            <h1>درخشش،<br />امضای توست.</h1>
            <p>طلاهایی برای هر روز؛ طراحی اصیل، قیمت شفاف و فاکتور رسمی.</p>
            <Link className="btn btn-light" href="/products">مشاهده کالکشن <span aria-hidden="true">←</span></Link>
          </div>
        </div>
        <div className="live-price-card">
          <span><Sparkles size={15} /> نرخ لحظه‌ای هر گرم طلای ۱۸ عیار</span>
          <strong>{formatMoney(price)}</strong>
        </div>
      </section>

      <section className="category-section container" aria-labelledby="category-title">
        <div className="center-heading"><span>انتخاب بر اساس سلیقه</span><h2 id="category-title">دسته‌بندی محصولات</h2></div>
        <div className="category-grid">
          {categories.map(([title, kind]) => (
            <Link href="/products" className="category-item" key={kind}>
              <span className={`category-visual category-${kind}`}><Gem size={34} /></span>
              <strong>{title}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="section products-section">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">تازه‌های زر</span><h2>محصولات منتخب</h2><p>قیمت‌ها با نرخ لحظه‌ای امروز محاسبه می‌شوند.</p></div>
            <Link className="text-link" href="/products">مشاهده همه محصولات ←</Link>
          </div>
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
              return <ProductCard key={product.id} href={`/products/${product.slug}`} name={product.name} category={product.category?.name ?? "طلا"} weight={Number(product.weightGrams)} purity={product.purity} price={formatMoney(product.fixedPrice?.toString() ?? calculated.total)} image={media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined} />;
            })}
          </div>
        </div>
      </section>

      <section id="about" className="editorial-section container">
        <div className="editorial-art"><span>۱۸K</span><Gem size={72} /></div>
        <div className="editorial-copy"><span className="eyebrow">قصه زر گالری</span><h2>زیبایی امروز،<br />ارزش ماندگار فردا</h2><p>هر قطعه در زر گالری با مشخصات دقیق وزن، عیار، اجرت و مالیات عرضه می‌شود. ما تجربه خرید آنلاین طلا را ساده، شفاف و درخور اعتماد شما ساخته‌ایم.</p><Link className="btn btn-primary" href="/products">کشف دنیای زر</Link></div>
      </section>

      <section id="guide" className="service-strip">
        <div className="container service-grid">
          <div><Truck /><strong>ارسال امن</strong><span>بسته‌بندی ویژه و ارسال مطمئن</span></div>
          <div><ShieldCheck /><strong>تضمین اصالت</strong><span>طلای ۱۸ عیار با مشخصات دقیق</span></div>
          <div><ReceiptText /><strong>فاکتور رسمی</strong><span>جزئیات کامل قیمت هر سفارش</span></div>
          <div><RefreshCcw /><strong>پشتیبانی خرید</strong><span>همراه شما پیش و پس از سفارش</span></div>
          <div><PackageCheck /><strong>تحویل قابل پیگیری</strong><span>پیگیری وضعیت از حساب کاربری</span></div>
        </div>
      </section>
    </main>
  );
}
