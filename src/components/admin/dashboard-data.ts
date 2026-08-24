import type { OrderStatus } from "@generated/prisma/enums";

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
};
