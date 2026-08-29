import type { Prisma, ProductStatus } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { nextDiscountBoundary } from "@/modules/products/discount-window";
import { BlueprintProductsView } from "@/components/admin/blueprint/products-view";
import { ClassicProductsView } from "@/components/admin/classic/products-view";
import type { AdminProductsListData } from "@/components/admin/products-list-data";

type Context = { searchParams: Promise<{ q?: string; status?: string; category?: string; featured?: string; stock?: string; discount?: string; page?: string; pageSize?: string }> };

export default async function AdminProducts({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const [catalogSettings, brandSettings, storeIndustry] = await Promise.all([getCatalogSettings(), getBrandSettings(), getStoreIndustry()]);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = (["DRAFT", "ACTIVE", "ARCHIVED"] as const).includes(params.status as ProductStatus) ? params.status as ProductStatus : undefined;
  const featured = params.featured === "yes" || params.featured === "no" ? params.featured : undefined;
  const stockFilter = (["out", "low", "in"] as const).includes(params.stock as "out" | "low" | "in") ? params.stock as "out" | "low" | "in" : undefined;
  const discountFilter = (["active", "upcoming", "none"] as const).includes(params.discount as "active" | "upcoming" | "none") ? params.discount as "active" | "upcoming" | "none" : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const now = new Date();
  const lowStockThreshold = catalogSettings.catalogLowStockThreshold;
  // A variant's own discount stands in for the product's whenever it has one, so "has a
  // discount" has to check both sides — same reasoning as the storefront's own badge and the
  // admin list's countdown.
  // A "فروش ویژه" carries no window at all and counts as active regardless of the clock, same as
  // `isProductDiscountActive` treats it.
  const activeDiscount: Prisma.ProductWhereInput = { OR: [
    { discountType: { not: null }, discountStartsAt: { lte: now }, discountEndsAt: { gte: now } },
    { discountType: { not: null }, discountStartsAt: null, discountEndsAt: null },
    { variants: { some: { discountType: { not: null }, discountStartsAt: { lte: now }, discountEndsAt: { gte: now } } } },
    { variants: { some: { discountType: { not: null }, discountStartsAt: null, discountEndsAt: null } } },
  ] };
  const upcomingDiscount: Prisma.ProductWhereInput = { OR: [
    { discountType: { not: null }, discountStartsAt: { gt: now } },
    { variants: { some: { discountType: { not: null }, discountStartsAt: { gt: now } } } },
  ] };
  const noDiscount: Prisma.ProductWhereInput = { discountType: null, variants: { none: { discountType: { not: null } } } };
  const where: Prisma.ProductWhereInput = {
    ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }, { slug: { contains: query } }] } : {}),
    ...(status ? { status } : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(featured ? { featured: featured === "yes" } : {}),
    ...(stockFilter === "out" ? { stock: { lte: 0 } } : stockFilter === "low" ? { stock: { gt: 0, lte: lowStockThreshold } } : stockFilter === "in" ? { stock: { gt: lowStockThreshold } } : {}),
    ...(discountFilter === "active" ? activeDiscount : discountFilter === "upcoming" ? upcomingDiscount : discountFilter === "none" ? noDiscount : {}),
  };
  const filteredTotal = await db.product.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const [products, categories, total, active, drafts] = await Promise.all([
    // Ordered by creation, not by `updatedAt`: editing a product used to move its row to the
    // top of the list, so a row would jump away from under the cursor the moment its status was
    // toggled. `id` breaks ties — seeded rows share a `createdAt` to the millisecond, and
    // without a deterministic tiebreaker LIMIT/OFFSET can repeat or skip them across pages.
    db.product.findMany({ where, skip: pagination.skip, take: pagination.pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { category: true, brand: { select: { name: true } }, media: { where: { isCover: true }, include: { media: true }, take: 1 }, _count: { select: { variants: true, orderItems: true } }, variants: { select: { discountStartsAt: true, discountEndsAt: true } }, optionTypes: { orderBy: { position: "asc" }, select: { type: { select: { name: true } }, values: { orderBy: { position: "asc" }, select: { value: { select: { label: true } } } } } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
  ]);

  const data: AdminProductsListData = {
    products,
    categories,
    counts: { total, active, drafts },
    filters: { query, status: status ?? "", category: params.category ?? "", featured: featured ?? "", stock: stockFilter ?? "", discount: discountFilter ?? "" },
    pagination,
    lowStockThreshold,
    storeIndustry,
    // A boundary on a combination's own discount window counts too — otherwise the list would
    // not know to refresh when a variant-only discount starts or ends.
    nextDiscountBoundaryAt: nextDiscountBoundary(products.flatMap((product) => [product, ...product.variants])),
  };

  return brandSettings.adminTemplate === "BLUEPRINT"
    ? <BlueprintProductsView {...data} />
    : <ClassicProductsView {...data} />;
}
