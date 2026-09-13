import { cache } from "react";
import { db } from "@/lib/db";
import { expirePendingOrders } from "@/modules/orders/expiration";

export type AccountOrderCounts = { totalOrders: number; activeOrders: number; deliveredOrders: number; returnCount: number };

// `cache` dedupes this within a request: the account layout (mobile order-status row, matching
// Digikala's profile hub) and the account dashboard page (desktop stats grid) both need the
// same four counts for the same user.
export const getAccountOrderCounts = cache(async (userId: string): Promise<AccountOrderCounts> => {
  await expirePendingOrders();
  const [totalOrders, activeOrders, deliveredOrders, returnCount] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.order.count({ where: { userId, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } } }),
    db.order.count({ where: { userId, status: "DELIVERED" } }),
    db.return.count({ where: { userId } }),
  ]);
  return { totalOrders, activeOrders, deliveredOrders, returnCount };
});
