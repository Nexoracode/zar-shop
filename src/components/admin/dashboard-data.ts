import type { OrderStatus } from "@generated/prisma/enums";
import type { DashboardAttention, DashboardInsights } from "@/modules/admin/dashboard-insights";
import type { VisitorAnalytics } from "@/modules/analytics/visitor-stats";

/** Everything `/admin` reads from the database, shaped once so both dashboard skins agree. */
export type AdminDashboardData = {
  isFullAdmin: boolean;
  activeProducts: number;
  customers: number;
  actionableOrders: number;
  revenueTotal: string;
  lowStockThreshold: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    itemCount: number;
    total: string;
    status: OrderStatus;
    createdAt: Date;
  }>;
  lowStockProducts: Array<{ id: string; name: string; sku: string; stock: number }>;
  /** Daily revenue for the trailing 14 days, oldest first — empty when not a full admin. */
  salesTrend: Array<{ date: string; label: string; total: string }>;
  /** Order counts by status across the whole store — empty when not a full admin. */
  orderStatusBreakdown: Array<{ status: OrderStatus; count: number }>;
  /** Storefront traffic — null unless the viewer is a full admin. */
  visitors: VisitorAnalytics | null;
  /** Sales figures for the last 30 days, top products, provinces and payment methods — null unless a full admin. */
  insights: DashboardInsights | null;
  /** Orders over visitors for the last 30 days, as a percentage; null until both exist. */
  conversion: number | null;
  /** Queues the viewer's role can act on. */
  attention: DashboardAttention;
};
