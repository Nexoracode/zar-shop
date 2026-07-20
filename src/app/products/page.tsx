import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: true; media: { include: { media: true } } };
}>;

export const dynamic = "force-dynamic";
export const metadata = { title: "محصولات" };

export default async function ProductsPage() {
  const [products, gold] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } }),
    getGoldPrice(),
  ]);
  const rate = Number(gold.pricePerGram18);

  return (
    <main>
      <section className="catalog-hero">
        <div className="container"><span>کالکشن زر گالری</span><h1>طلا برای هر لحظه</h1><p>مجموعه‌ای از طراحی‌های مینیمال و ماندگار با قیمت‌گذاری شفاف.</p><div className="catalog-rate">نرخ امروز: <strong>{formatMoney(rate)}</strong></div></div>
      </section>
      <section className="section container">
        <div className="catalog-toolbar"><span>{products.length.toLocaleString("fa-IR")} محصول</span><span>مرتب‌سازی: تازه‌ترین‌ها</span></div>
        <div className="product-grid">
          {products.map((product: ProductWithRelations) => {
            const amount = product.fixedPrice ? Number(product.fixedPrice) : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(product.weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) }).total;
            const media = product.media[0]?.media;
            return <ProductCard key={product.id} href={`/products/${product.slug}`} name={product.name} category={product.category?.name ?? "طلا"} weight={Number(product.weightGrams)} purity={product.purity} price={formatMoney(amount)} image={media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined} />;
          })}
          {!products.length && <div className="empty catalog-empty">هنوز محصولی منتشر نشده است.</div>}
        </div>
      </section>
    </main>
  );
}
