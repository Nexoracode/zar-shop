import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowDownUp } from "lucide-react";
import { StorefrontCatalogFilters } from "@/components/storefront-catalog-filters";
import { StorefrontCatalogFilterBar } from "@/components/storefront-catalog-filter-bar";
import { StorefrontCatalogGrid } from "@/components/storefront-catalog-grid";
import { db } from "@/lib/db";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getStorefrontCatalog } from "@/modules/products/storefront-catalog";
import { storefrontCatalogQuerySchema } from "@/modules/products/storefront-catalog-contract";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import type { Metadata } from "next";
import { env } from "@/lib/env";

type ProductSearchParams = {
  q?: string;
  category?: string;
  brandSlug?: string;
  page?: string;
  sortby?: string;
  MinPrice?: string;
  MaxPrice?: string;
  brand?: string | string[];
  color?: string | string[];
  attr?: string | string[];
  inStock?: string;
  hasDiscount?: string;
  freeShipping?: string;
  sameDayDelivery?: string;
};

type ProductHrefState = {
  q?: string;
  category?: string;
  brandSlug?: string;
  page?: string;
  sortby?: string;
  MinPrice?: string;
  MaxPrice?: string;
  brand?: string[];
  color?: string[];
  attr?: string[];
  inStock?: string;
  hasDiscount?: string;
  freeShipping?: string;
  sameDayDelivery?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<ProductSearchParams> }): Promise<Metadata> {
  const [settings, params] = await Promise.all([getGeneralStoreSettings(), searchParams]);
  const title = settings.industry === "GOLD" ? "محصولات طلا" : "محصولات";
  const description = settings.industry === "GOLD"
    ? "جدیدترین زیورآلات طلا با قیمت لحظه‌ای و فاکتور رسمی."
    : "کالاهای فروشگاه با قیمت به‌روز و ارسال قابل پیگیری.";
  const category = typeof params.category === "string" ? params.category : undefined;
  const brandSlug = typeof params.brandSlug === "string" ? params.brandSlug : undefined;
  const canonicalUrl = `${env.APP_URL}/products${category ? `?category=${encodeURIComponent(category)}` : brandSlug ? `?brandSlug=${encodeURIComponent(brandSlug)}` : ""}`;
  return { title, description, alternates: { canonical: canonicalUrl } };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ProductSearchParams> }) {
  // The catalog grid flags each card's favorite state per viewer (getStorefrontCatalog →
  // markFavoriteCards → getCurrentUser), and that cookies() read happens after other uncached
  // DB reads (the category/brand lookups below), so it can't establish dynamic rendering on its
  // own during prerendering. `connection()` marks this render as request-time explicitly.
  await connection();
  const params = await searchParams;
  const parsedQuery = storefrontCatalogQuerySchema.safeParse(params);
  if (!parsedQuery.success) notFound();
  const query = parsedQuery.data;
  const allCategories = await db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const selectedCategory = query.category ? allCategories.find((category) => category.slug === query.category) : null;
  if (query.category && !selectedCategory) notFound();
  const categoryIds = selectedCategory ? collectCategoryAndDescendantIds(selectedCategory.id, allCategories) : undefined;
  const selectedBrand = query.brandSlug ? await db.brand.findFirst({ where: { slug: query.brandSlug, isActive: true }, select: { name: true, slug: true } }) : null;
  if (query.brandSlug && !selectedBrand) notFound();
  const catalog = await getStorefrontCatalog(query, categoryIds);
  const { page, pageSize, totalPages: pageCount, totalItems: total } = catalog.pagination;
  const sortOptions = [
    { id: "popular", label: "پرفروش‌ترین" },
    { id: "newest", label: "جدیدترین" },
    { id: "price-asc", label: "ارزان‌ترین" },
    { id: "price-desc", label: "گران‌ترین" },
    { id: "oldest", label: "قدیمی‌ترین" },
  ] as const;

  function productsHref(overrides: Partial<ProductHrefState>) {
    const values: ProductHrefState = {
      q: query.q,
      category: query.category,
      brandSlug: query.brandSlug,
      sortby: query.sortby,
      MinPrice: query.MinPrice?.toString(),
      MaxPrice: query.MaxPrice?.toString(),
      brand: query.brand,
      color: selectedCategory ? query.color : undefined,
      attr: selectedCategory ? query.attr : undefined,
      inStock: query.inStock ? "1" : undefined,
      hasDiscount: query.hasDiscount ? "1" : undefined,
      freeShipping: query.freeShipping ? "1" : undefined,
      sameDayDelivery: query.sameDayDelivery ? "1" : undefined,
      page: query.page > 1 ? query.page.toString() : undefined,
      ...overrides,
    };
    const next = new URLSearchParams();
    if (values.q) next.set("q", values.q);
    if (values.category) next.set("category", values.category);
    if (values.brandSlug) next.set("brandSlug", values.brandSlug);
    if (values.sortby) next.set("sortby", values.sortby);
    if (values.MinPrice) next.set("MinPrice", values.MinPrice);
    if (values.MaxPrice) next.set("MaxPrice", values.MaxPrice);
    for (const brand of values.brand ?? []) next.append("brand", brand);
    for (const color of values.color ?? []) next.append("color", color);
    for (const attribute of values.attr ?? []) next.append("attr", attribute);
    if (values.inStock) next.set("inStock", values.inStock);
    if (values.hasDiscount) next.set("hasDiscount", values.hasDiscount);
    if (values.freeShipping) next.set("freeShipping", values.freeShipping);
    if (values.sameDayDelivery) next.set("sameDayDelivery", values.sameDayDelivery);
    if (values.page && values.page !== "1") next.set("page", values.page);
    return `/products?${next.toString()}`;
  }

  const resetFiltersHref = productsHref({ MinPrice: undefined, MaxPrice: undefined, brandSlug: undefined, brand: [], color: [], attr: [], inStock: undefined, hasDiscount: undefined, freeShipping: undefined, sameDayDelivery: undefined, page: undefined });
  const apiBaseQuery = productsHref({ page: undefined }).split("?")[1] ?? "";
  const selectedBrandsArr = query.brand ?? [];
  const selectedColorsArr = selectedCategory ? query.color ?? [] : [];
  const selectedAttributesArr = selectedCategory ? query.attr ?? [] : [];
  const filterKey = [query.MinPrice, query.MaxPrice].join("|");
  const filterProps = {
    facets: catalog.facets,
    categoryScoped: Boolean(selectedCategory),
    selectedBrands: selectedBrandsArr,
    selectedColors: selectedColorsArr,
    selectedAttributes: selectedAttributesArr,
    minPrice: query.MinPrice,
    maxPrice: query.MaxPrice,
    inStock: query.inStock,
    hasDiscount: query.hasDiscount,
    freeShipping: query.freeShipping,
    sameDayDelivery: query.sameDayDelivery,
    resetHref: resetFiltersHref,
  };
  const filters = <StorefrontCatalogFilters key={filterKey} {...filterProps} />;

  return <main className="bg-white px-4 py-7 sm:px-6 lg:py-10">
    <div className="mx-auto w-full max-w-[var(--store-max-width)]">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link href="/" className="transition hover:text-slate-900">خانه</Link><span>/</span>
        {selectedCategory ? <><Link href="/products" className="transition hover:text-slate-900">محصولات</Link><span>/</span><span className="font-bold text-slate-800">{selectedCategory.name}</span></> : <span className="font-bold text-slate-800">محصولات</span>}
        {selectedBrand && <><span>/</span><span className="font-bold text-slate-800">برند {selectedBrand.name}</span><Link href={productsHref({ brandSlug: undefined, page: undefined })} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف</Link></>}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="sticky top-[var(--storefront-sticky-offset,112px)] hidden lg:block" aria-label="فیلتر محصولات">{filters}</aside>
        <section className="min-w-0" aria-label="نتایج محصولات">
          <div className="mb-3">
            <StorefrontCatalogFilterBar
              facets={catalog.facets}
              categoryScoped={Boolean(selectedCategory)}
              selectedBrands={selectedBrandsArr}
              selectedColors={selectedColorsArr}
              selectedAttributes={selectedAttributesArr}
              minPrice={query.MinPrice}
              maxPrice={query.MaxPrice}
              inStock={query.inStock}
              hasDiscount={query.hasDiscount}
              freeShipping={query.freeShipping}
              sameDayDelivery={query.sameDayDelivery}
              resetHref={resetFiltersHref}
              sortOptions={sortOptions}
              currentSort={query.sortby}
            />
          </div>
          <div className="flex min-h-12 flex-wrap items-center gap-x-5 gap-y-3 border-b border-slate-200 pb-3 text-xs">
            <span className="hidden items-center gap-2 font-bold text-slate-800 lg:inline-flex"><ArrowDownUp size={17} />مرتب‌سازی:</span>
            {sortOptions.map((option) => <Link key={option.id} href={productsHref({ sortby: option.id, page: undefined })} aria-current={query.sortby === option.id ? "page" : undefined} className={`relative hidden py-2 transition after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)] lg:inline-block ${query.sortby === option.id ? "font-bold text-[var(--brand-primary)] after:scale-x-100" : "text-slate-500 after:scale-x-0 hover:text-[var(--brand-primary)]"}`}>{option.label}</Link>)}
            <span className="mr-auto text-[11px] text-slate-400">{total.toLocaleString("fa-IR")} کالا</span>
          </div>

          <StorefrontCatalogGrid key={apiBaseQuery} initialItems={catalog.items} initialPage={page} totalPages={pageCount} pageSize={pageSize} baseQuery={apiBaseQuery} />
        </section>
      </div>
    </div>
  </main>;
}
