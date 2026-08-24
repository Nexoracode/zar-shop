import type { Prisma } from "@generated/prisma/client";

export type ProductRow = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } }; _count: { select: { options: true } } } }>;

/** Everything `/admin/products` reads, shaped once so both list skins agree. */
export type AdminProductsListData = {
  products: ProductRow[];
  categories: Array<{ id: string; name: string }>;
  counts: { total: number; active: number; drafts: number };
  filters: { query: string; status: string; category: string; featured: string };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; skip: number };
  lowStockThreshold: number;
};
