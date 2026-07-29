import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";

type ProductWithRelations = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;

export const dynamic = "force-dynamic";
export const metadata = { title: "محصولات" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: categorySlug } = await searchParams;
  const [allCategories, gold] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getGoldPriceForDisplay(),
  ]);
  const selectedCategory = categorySlug ? allCategories.find((category) => category.slug === categorySlug) : null;
  if (categorySlug && !selectedCategory) notFound();
  const categoryIds = selectedCategory ? collectCategoryAndDescendantIds(selectedCategory.id, allCategories) : undefined;
  const products = await db.product.findMany({
    where: { status: "ACTIVE", ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) },
    include: { category: true, media: { include: { media: true }, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const childCategories = selectedCategory ? allCategories.filter((category) => category.parentId === selectedCategory.id) : allCategories.filter((category) => !category.parentId);
  const rate = gold ? Number(gold.pricePerGram18) : null;

  return (
    <main>
      {/* Catalog hero */}
      <section className="bg-[linear-gradient(135deg,#eee1d3,#f8f3ed_50%,#dfe6e2)] px-5 py-14 text-center sm:py-[76px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="text-[#785b27] text-[0.8rem]">{selectedCategory ? "دسته‌بندی محصولات" : "کالکشن زر گالری"}</span>
          <h1 className="mt-[5px] mb-0 text-[clamp(2.5rem,5vw,4.5rem)] font-medium">{selectedCategory?.name ?? "طلا برای هر لحظه"}</h1>
          <p className="m-0 text-[#747982]">{selectedCategory?.description ?? "مجموعه‌ای از طراحی‌های مینیمال و ماندگار با قیمت‌گذاری شفاف."}</p>
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
          {childCategories.length > 0 && (
            <nav className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="زیردسته‌ها">
              {!selectedCategory && <Link href="/products" className="shrink-0 border border-[#1c3155] bg-[#1c3155] px-4 py-2 text-xs text-white">همه محصولات</Link>}
              {childCategories.map((category) => (
                <Link key={category.id} href={`/products?category=${category.slug}`} className="shrink-0 border border-[#d9d4cb] bg-white px-4 py-2 text-xs text-[#39445a] transition hover:border-[#b5904c] hover:text-[#785b27]">
                  {category.name}
                </Link>
              ))}
            </nav>
          )}
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
                  industry={product.storeIndustry}
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
