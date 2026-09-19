import { Prisma } from "@generated/prisma/client";
import type { UserRole } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { hasPermission } from "@/modules/auth/permissions";

export const INSIGHT_PERIOD_DAYS = 30;
export const SUCCESSFUL_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export type DashboardInsights = {
  todayRevenue: string;
  todayOrders: number;
  periodRevenue: string;
  periodOrders: number;
  /** Revenue of the equally long period right before this one — what the growth figure compares against. */
  previousPeriodRevenue: string;
  newCustomers: number;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: string }>;
  provinces: Array<{ province: string; orders: number; revenue: string }>;
  payments: Array<{ provider: string; count: number; amount: string }>;
};

/** Queue sizes an admin can act on; a field is `null` when the viewer's role cannot manage that queue. */
export type DashboardAttention = {
  pendingReviews: number | null;
  openTickets: number | null;
  pendingReturns: number | null;
  unresolvedMessages: number | null;
};

/** Percentage change from `previous` to `current`, or null when there is nothing to compare against. */
export function growthPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Orders per visitor as a percentage; null until there is any traffic to divide by. */
export function conversionRate(orders: number, visitors: number): number | null {
  if (visitors <= 0) return null;
  return Math.round((orders / visitors) * 1000) / 10;
}

export async function getDashboardInsights(now = new Date()): Promise<DashboardInsights> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const periodStart = new Date(todayStart);
  periodStart.setDate(periodStart.getDate() - (INSIGHT_PERIOD_DAYS - 1));
  const previousStart = new Date(periodStart);
  previousStart.setDate(previousStart.getDate() - INSIGHT_PERIOD_DAYS);
  const successful = [...SUCCESSFUL_ORDER_STATUSES];

  const [today, period, previous, newCustomers, topGroups, provinceRows, paymentGroups] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { status: { in: successful }, createdAt: { gte: todayStart } } }),
    db.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { status: { in: successful }, createdAt: { gte: periodStart } } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: { in: successful }, createdAt: { gte: previousStart, lt: periodStart } } }),
    db.user.count({ where: { role: "CUSTOMER", isGuest: false, createdAt: { gte: periodStart } } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { in: successful }, createdAt: { gte: periodStart } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    // The province lives inside the order's shipping-address snapshot, so this reads it out of the JSON.
    db.$queryRaw<Array<{ province: string | null; orders: bigint; revenue: Prisma.Decimal }>>(Prisma.sql`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(shippingAddress, '$.province')) AS province, COUNT(*) AS orders, SUM(total) AS revenue
      FROM \`Order\`
      WHERE status IN (${Prisma.join(successful)}) AND createdAt >= ${periodStart}
      GROUP BY province ORDER BY revenue DESC LIMIT 12`),
    db.payment.groupBy({
      by: ["provider"],
      where: { status: "SUCCESS", paidAt: { gte: periodStart } },
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _count: { provider: "desc" } },
    }),
  ]);

  const productIds = topGroups.flatMap((group) => (group.productId ? [group.productId] : []));
  const products = productIds.length ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  return {
    todayRevenue: today._sum.total?.toString() ?? "0",
    todayOrders: today._count._all,
    periodRevenue: period._sum.total?.toString() ?? "0",
    periodOrders: period._count._all,
    previousPeriodRevenue: previous._sum.total?.toString() ?? "0",
    newCustomers,
    topProducts: topGroups.flatMap((group) => {
      const name = group.productId ? productNames.get(group.productId) : undefined;
      return group.productId && name ? [{ productId: group.productId, name, quantity: group._sum.quantity ?? 0, revenue: group._sum.total?.toString() ?? "0" }] : [];
    }),
    provinces: provinceRows.map((row) => ({ province: row.province?.trim() || "نامشخص", orders: Number(row.orders), revenue: row.revenue.toString() })),
    payments: paymentGroups.map((group) => ({ provider: group.provider, count: group._count._all, amount: group._sum.amount?.toString() ?? "0" })),
  };
}

export async function getDashboardAttention(role: UserRole): Promise<DashboardAttention> {
  const canCatalog = hasPermission(role, "catalog:manage");
  const canOrders = hasPermission(role, "orders:manage");
  const canTickets = hasPermission(role, "tickets:manage");
  const [pendingReviews, openTickets, pendingReturns, unresolvedMessages] = await Promise.all([
    canCatalog ? db.productReview.count({ where: { status: "PENDING", parentId: null } }) : Promise.resolve(null),
    canTickets ? db.supportTicket.count({ where: { status: "OPEN" } }) : Promise.resolve(null),
    canOrders ? db.return.count({ where: { status: "PENDING" } }) : Promise.resolve(null),
    canOrders ? db.contactMessage.count({ where: { isResolved: false } }) : Promise.resolve(null),
  ]);
  return { pendingReviews, openTickets, pendingReturns, unresolvedMessages };
}
