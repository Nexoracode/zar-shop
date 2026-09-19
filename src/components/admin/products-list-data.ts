import type { Prisma } from "@generated/prisma/client";

export type ProductRow = Prisma.ProductGetPayload<{ include: { category: true; brand: { select: { name: true } }; media: { include: { media: true } }; _count: { select: { variants: true; orderItems: true } }; variants: { select: { selection: true; isActive: true; discountType: true; discountValue: true; discountStartsAt: true; discountEndsAt: true } }; optionTypes: { select: { type: { select: { name: true } }; values: { select: { value: { select: { label: true; color: { select: { hex: true } } } } } } } } } }>;

/** Everything `/admin/products` reads, shaped once so both list skins agree. */
export type AdminProductsListData = {
  products: ProductRow[];
  categories: Array<{ id: string; name: string }>;
  counts: { total: number; active: number; drafts: number };
  filters: { query: string; status: string; category: string; stock: string; discount: string };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; skip: number };
  lowStockThreshold: number;
  storeIndustry: "GOLD" | "GENERAL";
  /** Soonest moment a row's discount starts or ends, so the table can redraw itself then. */
  nextDiscountBoundaryAt: string | null;
  initialHiddenColumns: string[];
};
