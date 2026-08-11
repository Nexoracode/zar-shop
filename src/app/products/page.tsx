import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { StorefrontCatalogFilters } from "@/components/storefront-catalog-filters";
import { db } from "@/lib/db";
import { collectCategoryAndDescendantIds } from "@/modules/categories/category-tree";
import { getStorefrontCatalog } from "@/modules/products/storefront-catalog";
import { storefrontCatalogQuerySchema } from "@/modules/products/storefront-catalog-contract";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import type { Metadata } from "next";

type ProductSearchParams = {
  q?: string;
  category?: string;
  page?: string;
  sortby?: string;
  MinPrice?: string;
  MaxPrice?: string;
  color?: string | string[];
  attr?: string | string[];
  inStock?: string;
};

type ProductHrefState = {
  q?: string;
  category?: string;
  page?: string;
  sortby?: string;
  MinPrice?: string;
  MaxPrice?: string;
  color?: string[];
  attr?: string[];
  inStock?: string;
};

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
  const allCategories = await db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const selectedCategory = query.category ? allCategories.find((category) => category.slug === query.category) : null;
  if (query.category && !selectedCategory) notFound();
  const categoryIds = selectedCategory ? collectCategoryAndDescendantIds(selectedCategory.id, allCategories) : undefined;
  const catalog = await getStorefrontCatalog(query, categoryIds);
  const { page, totalPages: pageCount, totalItems: total } = catalog.pagination;
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
      sortby: query.sortby,
      MinPrice: query.MinPrice?.toString(),
      MaxPrice: query.MaxPrice?.toString(),
      color: query.color,
      attr: query.attr,
      inStock: query.inStock ? "1" : undefined,
      page: query.page > 1 ? query.page.toString() : undefined,
      ...overrides,
    };
    const next = new URLSearchParams();
    if (values.q) next.set("q", values.q);
    if (values.category) next.set("category", values.category);
    if (values.sortby) next.set("sortby", values.sortby);
    if (values.MinPrice) next.set("MinPrice", values.MinPrice);
    if (values.MaxPrice) next.set("MaxPrice", values.MaxPrice);
    for (const color of values.color ?? []) next.append("color", color);
    for (const attribute of values.attr ?? []) next.append("attr", attribute);
    if (values.inStock) next.set("inStock", values.inStock);
    if (values.page && values.page !== "1") next.set("page", values.page);
    return `/products?${next.toString()}`;
  }

  const resetFiltersHref = productsHref({ MinPrice: undefined, MaxPrice: undefined, color: [], attr: [], inStock: undefined, page: undefined });
  const filters = <StorefrontCatalogFilters
    facets={catalog.facets}
    selectedColors={query.color ?? []}
    selectedAttributes={query.attr ?? []}
    minPrice={query.MinPrice}
    maxPrice={query.MaxPrice}
    inStock={query.inStock}
    hidden={{ q: query.q, category: query.category, sortby: query.sortby }}
    resetHref={resetFiltersHref}
  />;

  return <main className="bg-white px-4 py-7 sm:px-6 lg:py-10">
    <div className="mx-auto w-full max-w-[1600px]">
      {query.q && <p className="mb-5 text-sm text-slate-600">نتایج جستجو برای <strong className="text-slate-900">«{query.q}»</strong></p>}
      <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="sticky top-[var(--storefront-sticky-offset,112px)] hidden lg:block" aria-label="فیلتر محصولات">{filters}</aside>
        <section className="min-w-0" aria-label="نتایج محصولات">
          <div className="mb-5 lg:hidden">{filters}</div>
          <div className="flex min-h-12 flex-wrap items-center gap-x-5 gap-y-3 border-b border-slate-200 pb-3 text-xs">
            <span className="inline-flex items-center gap-2 font-bold text-slate-800"><ArrowDownUp size={17} />مرتب‌سازی:</span>
            {sortOptions.map((option) => <Link key={option.id} href={productsHref({ sortby: option.id, page: undefined })} aria-current={query.sortby === option.id ? "page" : undefined} className={`relative py-2 transition after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-[var(--brand-primary)] ${query.sortby === option.id ? "font-bold text-[var(--brand-primary)] after:scale-x-100" : "text-slate-500 after:scale-x-0 hover:text-[var(--brand-primary)]"}`}>{option.label}</Link>)}
            <span className="mr-auto text-[11px] text-slate-400">{total.toLocaleString("fa-IR")} کالا</span>
          </div>

          <div className="mt-5 grid grid-cols-2 border-r border-t border-slate-200 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {catalog.items.map((product) => <ProductCard key={product.id} {...product} storefrontVariant="catalog" />)}
            {!catalog.items.length && <div className="col-span-full grid min-h-72 place-items-center border-b border-l border-slate-200 px-4 text-center text-sm text-slate-500">محصولی مطابق فیلترهای انتخاب‌شده پیدا نشد.</div>}
          </div>

          {pageCount > 1 && <nav aria-label="صفحه‌بندی محصولات" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <Link key={number} href={productsHref({ page: number.toString() })} aria-current={number === page ? "page" : undefined} className={`grid size-10 place-items-center rounded-lg border text-sm transition ${number === page ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "border-slate-200 bg-white text-slate-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"}`}>{number.toLocaleString("fa-IR")}</Link>)}
          </nav>}
        </section>
      </div>
    </div>
  </main>;
}
