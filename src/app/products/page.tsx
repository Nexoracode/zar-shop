import type { Prisma } from "@generated/prisma/client";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

type ProductWithRelations = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;

export const dynamic = "force-dynamic";
export const metadata = { title: "محصولات" };

export default async function ProductsPage() {
  const [products, gold] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } }),
    getGoldPriceForDisplay(),
  ]);
  const rate = gold ? Number(gold.pricePerGram18) : null;

  return (
    <main>
      {/* Catalog hero */}
      <section className="bg-[linear-gradient(135deg,#eee1d3,#f8f3ed_50%,#dfe6e2)] px-5 py-14 text-center sm:py-[76px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="text-[#785b27] text-[0.8rem]">کالکشن زر گالری</span>
          <h1 className="mt-[5px] mb-0 text-[clamp(2.5rem,5vw,4.5rem)] font-medium">طلا برای هر لحظه</h1>
          <p className="m-0 text-[#747982]">مجموعه‌ای از طراحی‌های مینیمال و ماندگار با قیمت‌گذاری شفاف.</p>
          <div className="mt-5 text-[0.78rem]">
            نرخ امروز: <strong className="text-[#1c3155] text-[0.95rem]">
              {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate)}
            </strong>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="px-5 py-14 sm:px-6 sm:py-[86px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mb-[25px] pb-[13px] flex justify-between border-b border-[#e7e6e2] text-[#747982] text-[0.8rem]">
            <span>{products.length.toLocaleString("fa-IR")} محصول</span>
            <span>مرتب‌سازی: تازه‌ترین‌ها</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product: ProductWithRelations) => {
              const amount = product.fixedPrice
                ? Number(product.fixedPrice)
                : rate === null
                  ? null
                  : calculateProductPrice({ goldPricePerGram18: rate, weightGrams: Number(product.weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) }).total;
              const media = product.media[0]?.media;
              return (
                <ProductCard
                  key={product.id}
                  href={`/products/${product.slug}`}
                  name={product.name}
                  category={product.category?.name ?? "طلا"}
                  weight={Number(product.weightGrams)}
                  purity={product.purity}
                  price={amount === null ? "قیمت موقتاً در دسترس نیست" : formatMoney(amount)}
                  image={media?.type === "IMAGE" ? { src: media.url, alt: media.alt ?? product.name } : undefined}
                />
              );
            })}
            {!products.length && (
              <div className="col-span-full py-12 text-center text-[#747982]">
                هنوز محصولی منتشر نشده است.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
