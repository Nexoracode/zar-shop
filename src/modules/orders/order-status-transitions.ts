import type { OrderStatus } from "@generated/prisma/enums";

/**
 * Which statuses an admin may move an order into from each current status. Forward moves along
 * the fulfilment path, one-step corrections back, and the money-side states (CANCELLED/REFUNDED)
 * where they make sense. What it blocks: skipping straight from an unpaid state to a fulfilment
 * state, and any move out of REFUNDED, which is terminal.
 *
 * Kept in its own module with no server-only imports so the status `<select>` (a client
 * component) and the server-side guard in `admin-status.ts` read the same matrix.
 */
export const allowedAdminOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "EXPIRED", "CANCELLED"],
  EXPIRED: ["PENDING_PAYMENT", "PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["PROCESSING", "DELIVERED", "REFUNDED"],
  DELIVERED: ["PROCESSING", "SHIPPED", "REFUNDED"],
  CANCELLED: ["PENDING_PAYMENT", "PAID"],
  REFUNDED: [],
};

export function canAdminMoveOrder(from: OrderStatus, to: OrderStatus) {
  return from === to || allowedAdminOrderTransitions[from].includes(to);
}

/** The statuses a status `<select>` should offer for an order currently in `from` (itself included). */
export function adminOrderStatusOptions(from: OrderStatus): OrderStatus[] {
  return [from, ...allowedAdminOrderTransitions[from]];
}
