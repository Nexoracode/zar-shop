import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { BlueprintDashboardView } from "@/components/admin/blueprint/dashboard-view";
import { ClassicDashboardView } from "@/components/admin/classic/dashboard-view";
import type { AdminDashboardData } from "@/components/admin/dashboard-data";

export default async function AdminPage() {
  const actor = await requirePermission("dashboard:view");
  const isFullAdmin = actor.role === "ADMIN";
  const [catalogSettings, brandSettings] = await Promise.all([getCatalogSettings(), getBrandSettings()]);
  const [activeProducts, customers, actionableOrders, revenue, recentOrders, lowStockProducts] = await Promise.all([
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
  ]);

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
  };

  return brandSettings.adminTemplate === "BLUEPRINT"
    ? <BlueprintDashboardView {...data} />
    : <ClassicDashboardView {...data} />;
}
