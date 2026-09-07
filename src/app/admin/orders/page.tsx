import type { Prisma } from "@generated/prisma/client";
import { OrderStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { BlueprintOrdersView, serializeAdminOrderRow } from "@/components/admin/blueprint/orders-view";

type SearchParams = Promise<{ q?: string; status?: string; product?: string; page?: string; pageSize?: string }>;

const statuses = Object.values(OrderStatus);

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as OrderStatus) ? params.status as OrderStatus : undefined;
  const productId = params.product?.trim() || undefined;
  const filteredProduct = productId ? await db.product.findUnique({ where: { id: productId }, select: { id: true, name: true } }) : null;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(filteredProduct ? { items: { some: { productId: filteredProduct.id } } } : {}),
    ...(query ? {
      OR: [
        { orderNumber: { contains: query } },
        { user: { is: { OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ] } } },
      ],
    } : {}),
  };
  const [filteredTotal, orderSettings] = await Promise.all([db.order.count({ where }), getOrderSettings()]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const orders = await db.order.findMany({
    where,
    include: { user: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return <BlueprintOrdersView
    orders={orders.map(serializeAdminOrderRow)}
    query={query}
    status={status ?? ""}
    statuses={statuses}
    filteredProduct={filteredProduct}
    warningMinutes={orderSettings.orderWarningMinutes}
    pagination={pagination}
  />;
}
