import type { Prisma } from "@generated/prisma/client";
import { BlueprintPromotionsView } from "@/components/admin/blueprint/promotions-view";
import { requirePermission } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { serializePromotion } from "@/modules/promotions/admin";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";

type Context = { searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string; pageSize?: string }> };

export default async function AdminPromotionsPage({ searchParams }: Context) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : undefined;
  const type = params.type === "COUPON" || params.type === "FREE_SHIPPING" || params.type === "NEXT_PURCHASE" || params.type === "FIRST_PURCHASE" ? params.type : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.PromotionWhereInput = {
    ...(query ? { OR: [{ title: { contains: query } }, { code: { contains: query } }] } : {}),
    ...(status ? { isActive: status === "active" } : {}),
    ...(type ? { type } : {}),
  };
  const filteredTotal = await db.promotion.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const promotions = await db.promotion.findMany({
    where,
    include: { _count: { select: { redemptions: true, rewards: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const items = promotions.map(serializePromotion);
  return <BlueprintPromotionsView initialItems={items} query={query} status={status} type={type} pagination={pagination} />;
}
