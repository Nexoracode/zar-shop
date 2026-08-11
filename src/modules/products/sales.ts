export const completedSaleOrderStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export function calculateSoldPercent(soldQuantity: number, currentStock: number) {
  const sold = Math.max(0, Math.trunc(soldQuantity));
  const stock = Math.max(0, Math.trunc(currentStock));
  const totalAvailable = sold + stock;
  if (totalAvailable === 0) return 0;
  return Math.min(100, Math.round((sold / totalAvailable) * 100));
}
