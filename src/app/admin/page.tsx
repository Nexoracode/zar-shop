import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { BlueprintDashboardView } from "@/components/admin/blueprint/dashboard-view";
import { ClassicDashboardView } from "@/components/admin/classic/dashboard-view";
import type { AdminDashboardData } from "@/components/admin/dashboard-data";

const SALES_TREND_DAYS = 14;
const SUCCESSFUL_ORDER_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

/** Local-calendar-day key — matches how `formatDate` below already renders dates in the server's own timezone. */
function dayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

export default async function AdminPage() {
  const actor = await requirePermission("dashboard:view");
  const isFullAdmin = actor.role === "ADMIN";
  const [catalogSettings, brandSettings] = await Promise.all([getCatalogSettings(), getBrandSettings()]);

  const trendStart = new Date();
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - (SALES_TREND_DAYS - 1));

  const [activeProducts, customers, actionableOrders, revenue, recentOrders, lowStockProducts, trendOrders, statusGroups] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    }),
    db.order.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { lte: catalogSettings.catalogLowStockThreshold } },
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    isFullAdmin
      ? db.order.findMany({ where: { createdAt: { gte: trendStart }, status: { in: [...SUCCESSFUL_ORDER_STATUSES] } }, select: { createdAt: true, total: true } })
      : Promise.resolve([]),
    isFullAdmin ? db.order.groupBy({ by: ["status"], _count: { _all: true } }) : Promise.resolve([]),
  ]);

  const dayTotals = new Map<string, number>();
  for (let offset = 0; offset < SALES_TREND_DAYS; offset += 1) {
    const day = new Date(trendStart);
    day.setDate(day.getDate() + offset);
    dayTotals.set(dayKey(day), 0);
  }
  for (const order of trendOrders) {
    const key = dayKey(order.createdAt);
    if (dayTotals.has(key)) dayTotals.set(key, dayTotals.get(key)! + Number(order.total));
  }
  const salesTrend = [...dayTotals.entries()].map(([, total], index) => {
    const day = new Date(trendStart);
    day.setDate(day.getDate() + index);
    return { date: day.toISOString(), label: day.toLocaleDateString("fa-IR", { day: "numeric", month: "short" }), total: total.toString() };
  });

  const orderStatusBreakdown = statusGroups.map((group) => ({ status: group.status, count: group._count._all })).filter((group) => group.count > 0);

  const data: AdminDashboardData = {
    isFullAdmin,
    activeProducts,
    customers,
    actionableOrders,
    revenueTotal: revenue._sum.total?.toString() ?? "0",
    lowStockThreshold: catalogSettings.catalogLowStockThreshold,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email || order.user.phone || "کاربر بدون نام",
      itemCount: order._count.items,
      total: order.total.toString(),
      status: order.status,
      createdAt: order.createdAt,
    })),
    lowStockProducts,
    salesTrend,
    orderStatusBreakdown,
  };

  return brandSettings.adminTemplate === "BLUEPRINT"
    ? <BlueprintDashboardView {...data} />
    : <ClassicDashboardView {...data} />;
}
