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

type Context = { searchParams: Promise<{ q?: string; status?: string; category?: string; featured?: string; page?: string; pageSize?: string }> };

export default async function AdminProducts({ searchParams }: Context) {
  await requirePermission("catalog:manage");
  const [catalogSettings, brandSettings, storeIndustry] = await Promise.all([getCatalogSettings(), getBrandSettings(), getStoreIndustry()]);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = (["DRAFT", "ACTIVE", "ARCHIVED"] as const).includes(params.status as ProductStatus) ? params.status as ProductStatus : undefined;
  const featured = params.featured === "yes" || params.featured === "no" ? params.featured : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.ProductWhereInput = {
    ...(query ? { OR: [{ name: { contains: query } }, { sku: { contains: query } }, { slug: { contains: query } }] } : {}),
    ...(status ? { status } : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(featured ? { featured: featured === "yes" } : {}),
  };
  const filteredTotal = await db.product.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const [products, categories, total, active, drafts] = await Promise.all([
    // Ordered by creation, not by `updatedAt`: editing a product used to move its row to the
    // top of the list, so a row would jump away from under the cursor the moment its status was
    // toggled. `id` breaks ties — seeded rows share a `createdAt` to the millisecond, and
    // without a deterministic tiebreaker LIMIT/OFFSET can repeat or skip them across pages.
    db.product.findMany({ where, skip: pagination.skip, take: pagination.pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { category: true, media: { where: { isCover: true }, include: { media: true }, take: 1 }, _count: { select: { variants: true } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
  ]);

  const data: AdminProductsListData = {
    products,
    categories,
    counts: { total, active, drafts },
    filters: { query, status: status ?? "", category: params.category ?? "", featured: featured ?? "" },
    pagination,
    lowStockThreshold: catalogSettings.catalogLowStockThreshold,
    storeIndustry,
    nextDiscountBoundaryAt: nextDiscountBoundary(products),
  };

  return brandSettings.adminTemplate === "BLUEPRINT"
    ? <BlueprintProductsView {...data} />
    : <ClassicProductsView {...data} />;
}
