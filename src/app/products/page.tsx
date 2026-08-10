import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import { getStorefrontCatalog } from "@/modules/products/storefront-catalog";
import { storefrontCatalogQuerySchema } from "@/modules/products/storefront-catalog-contract";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import type { Metadata } from "next";

type ProductSearchParams = { q?: string; category?: string; page?: string; sortby?: string; MinPrice?: string; MaxPrice?: string };

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGeneralStoreSettings();
  return { title: settings.industry === "GOLD" ? "محصولات طلا" : "محصولات" };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ProductSearchParams> }) {
  const params = await searchParams;
  const parsedQuery = storefrontCatalogQuerySchema.safeParse(params);
  if (!parsedQuery.success) notFound();
  const query = parsedQuery.data;
  const [allCategories, settings] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getGeneralStoreSettings(),
  ]);
  const selectedCategory = query.category ? allCategories.find((category) => category.slug === query.category) : null;
  if (query.category && !selectedCategory) notFound();
  const categoryIds = selectedCategory ? collectCategoryAndDescendantIds(selectedCategory.id, allCategories) : undefined;
  const [catalog, gold] = await Promise.all([
    getStorefrontCatalog(query, categoryIds),
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
  ]);
  const childCategories = selectedCategory ? allCategories.filter((category) => category.parentId === selectedCategory.id) : allCategories.filter((category) => !category.parentId);
  const rate = gold ? Number(gold.pricePerGram18) : null;
  const { page, totalPages: pageCount, totalItems: total } = catalog.pagination;
  const sortLabels = { newest: "تازه‌ترین‌ها", oldest: "قدیمی‌ترین‌ها", "price-asc": "ارزان‌ترین‌ها", "price-desc": "گران‌ترین‌ها", popular: "محبوب‌ترین‌ها" } as const;

  function productsHref(overrides: Partial<ProductSearchParams>) {
    const next = new URLSearchParams();
    const values = { q: query.q, category: query.category, sortby: query.sortby, MinPrice: query.MinPrice?.toString(), MaxPrice: query.MaxPrice?.toString(), ...overrides };
    if (values.q) next.set("q", values.q);
    if (values.category) next.set("category", values.category);
    if (values.sortby) next.set("sortby", values.sortby);
    if (values.MinPrice) next.set("MinPrice", values.MinPrice);
    if (values.MaxPrice) next.set("MaxPrice", values.MaxPrice);
    if (values.page && values.page !== "1") next.set("page", values.page);
    return `/products?${next.toString()}`;
  }

  return (
    <main>
      {/* Catalog hero */}
      <section className="bg-[linear-gradient(135deg,#eee1d3,#f8f3ed_50%,#dfe6e2)] px-5 py-14 text-center sm:py-[76px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <span className="text-[var(--brand-accent)] text-[0.8rem]">{query.q ? "نتایج جستجو" : selectedCategory ? "دسته‌بندی محصولات" : `کالکشن ${settings.storeName}`}</span>
          <h1 className="mt-[5px] mb-0 text-[clamp(2.5rem,5vw,4.5rem)] font-medium">{query.q ? `«${query.q}»` : selectedCategory?.name ?? (settings.industry === "GOLD" ? "طلا برای هر لحظه" : "محصولاتی برای انتخاب شما")}</h1>
          <p className="m-0 text-[#747982]">{query.q ? `${catalog.pagination.totalItems.toLocaleString("fa-IR")} محصول مرتبط پیدا شد.` : selectedCategory?.description ?? (settings.industry === "GOLD" ? "مجموعه‌ای از طراحی‌های مینیمال و ماندگار با قیمت‌گذاری شفاف." : "مجموعه محصولات فروشگاه با اطلاعات روشن و خرید مطمئن.")}</p>
          {settings.industry === "GOLD" && <div className="mt-5 text-[0.78rem]">
            نرخ امروز: <strong className="text-[var(--brand-primary)] text-[0.95rem]">
              {rate === null ? "موقتاً در دسترس نیست" : formatMoney(rate, settings.currency)}
            </strong>
          </div>}
        </div>
      </section>

      {/* Product grid */}
      <section className="px-5 py-14 sm:px-6 sm:py-[86px]">
        <div className="mx-auto w-full max-w-[1240px]">
          {childCategories.length > 0 && (
            <nav className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="زیردسته‌ها">
              {!selectedCategory && <Link href={productsHref({ category: undefined, page: undefined })} className="shrink-0 border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-4 py-2 text-xs text-[var(--brand-primary-foreground)]">همه محصولات</Link>}
              {childCategories.map((category) => (
                <Link key={category.id} href={productsHref({ category: category.slug, page: undefined })} className="shrink-0 border border-[#d9d4cb] bg-white px-4 py-2 text-xs text-[#39445a] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
                  {category.name}
                </Link>
              ))}
            </nav>
          )}
          <div className="mb-[25px] pb-[13px] flex justify-between border-b border-[#e7e6e2] text-[#747982] text-[0.8rem]">
            <span>{total.toLocaleString("fa-IR")} محصول</span>
            <span>مرتب‌سازی: {sortLabels[query.sortby]}</span>
          </div>

          <div className="storefront-product-grid grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.items.map((product) => <ProductCard key={product.id} {...product} />)}
            {!catalog.items.length && (
              <div className="col-span-full py-12 text-center text-[#747982]">
                هنوز محصولی منتشر نشده است.
              </div>
            )}
          </div>
          {pageCount > 1 && <nav aria-label="صفحه‌بندی محصولات" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => {
              return <Link key={number} href={productsHref({ page: number.toString() })} aria-current={number === page ? "page" : undefined} className={`grid size-10 place-items-center border text-sm transition ${number === page ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-[#d9d4cb] bg-white text-[#39445a] hover:border-[var(--brand-accent)]"}`}>{number.toLocaleString("fa-IR")}</Link>;
            })}
          </nav>}
        </div>
      </section>
    </main>
  );
}
