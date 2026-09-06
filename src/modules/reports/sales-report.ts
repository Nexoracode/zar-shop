import type { OrderStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import type { ReportPeriod, ReportRange } from "./report-range";

/** An order is a realised sale once it is paid; pending, expired, cancelled and refunded orders
 * never count toward revenue. Same list the dashboard and the product report use. */
export const SOLD_ORDER_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export type ReportKpis = {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  newCustomers: number;
};

export type ReportTopProduct = { productId: string; name: string; sku: string; quantity: number; revenue: number };
export type ReportTopCategory = { categoryId: string | null; name: string; revenue: number; share: number };
export type ReportDailyPoint = { date: string; label: string; revenue: number; orderCount: number };

export type SalesReport = {
  period: { start: string; end: string; range: ReportRange | null; custom: boolean };
  kpis: ReportKpis;
  topProducts: ReportTopProduct[];
  topCategories: ReportTopCategory[];
  dailySales: ReportDailyPoint[];
};

/** Local-calendar-day key, matching the server timezone `formatDate` renders in. */
function dayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

export async function getSalesReport(period: ReportPeriod): Promise<SalesReport> {
  const soldOrders = { status: { in: SOLD_ORDER_STATUSES }, createdAt: { gte: period.start, lte: period.end } };

  const [orders, newCustomers, groupedProducts, categoryItems] = await Promise.all([
    db.order.findMany({ where: soldOrders, select: { createdAt: true, total: true } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: period.start, lte: period.end } } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: soldOrders },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    db.orderItem.findMany({
      where: { order: soldOrders },
      select: { total: true, product: { select: { categoryId: true, category: { select: { name: true } } } } },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount ? totalRevenue / orderCount : 0;

  const buckets = new Map<string, { revenue: number; orderCount: number }>();
  for (let offset = 0; offset < period.days; offset += 1) {
    const day = new Date(period.start);
    day.setDate(day.getDate() + offset);
    buckets.set(dayKey(day), { revenue: 0, orderCount: 0 });
  }
  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.createdAt));
    if (bucket) {
      bucket.revenue += Number(order.total);
      bucket.orderCount += 1;
    }
  }
  const dailySales: ReportDailyPoint[] = [...buckets.values()].map((bucket, index) => {
    const day = new Date(period.start);
    day.setDate(day.getDate() + index);
    return {
      date: day.toISOString(),
      label: day.toLocaleDateString("fa-IR", { day: "numeric", month: "short" }),
      revenue: bucket.revenue,
      orderCount: bucket.orderCount,
    };
  });

  const productIds = groupedProducts.map((group) => group.productId).filter((id): id is string => Boolean(id));
  const productMeta = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } })
    : [];
  const metaById = new Map(productMeta.map((product) => [product.id, product]));
  const topProducts: ReportTopProduct[] = groupedProducts.flatMap((group) => {
    if (!group.productId) return [];
    const meta = metaById.get(group.productId);
    return [{
      productId: group.productId,
      name: meta?.name ?? "محصول حذف‌شده",
      sku: meta?.sku ?? "—",
      quantity: group._sum.quantity ?? 0,
      revenue: Number(group._sum.total ?? 0),
    }];
  });

  const categoryRevenue = new Map<string, { name: string; revenue: number }>();
  let categorisedTotal = 0;
  for (const item of categoryItems) {
    const revenue = Number(item.total);
    categorisedTotal += revenue;
    const key = item.product?.categoryId ?? "__none__";
    const name = item.product?.category?.name ?? "بدون دسته‌بندی";
    const current = categoryRevenue.get(key);
    if (current) current.revenue += revenue;
    else categoryRevenue.set(key, { name, revenue });
  }
  const topCategories: ReportTopCategory[] = [...categoryRevenue.entries()]
    .map(([key, value]) => ({
      categoryId: key === "__none__" ? null : key,
      name: value.name,
      revenue: value.revenue,
      share: categorisedTotal ? (value.revenue / categorisedTotal) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    period: { start: period.start.toISOString(), end: period.end.toISOString(), range: period.range, custom: period.custom },
    kpis: { totalRevenue, orderCount, averageOrderValue, newCustomers },
    topProducts,
    topCategories,
    dailySales,
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The two report tables plus the KPI summary, as a spreadsheet-friendly CSV (CRLF rows). The
 * caller prepends the UTF-8 BOM so Excel reads the Persian text correctly. */
export function buildSalesReportCsv(report: SalesReport) {
  const rows: (string | number)[][] = [];
  rows.push(["گزارش مالی و فروش"]);
  rows.push([
    "از",
    new Date(report.period.start).toLocaleDateString("fa-IR"),
    "تا",
    new Date(report.period.end).toLocaleDateString("fa-IR"),
  ]);
  rows.push([]);
  rows.push(["شاخص", "مقدار"]);
  rows.push(["مجموع فروش (ریال)", Math.round(report.kpis.totalRevenue)]);
  rows.push(["تعداد سفارش", report.kpis.orderCount]);
  rows.push(["میانگین ارزش سفارش (ریال)", Math.round(report.kpis.averageOrderValue)]);
  rows.push(["مشتری جدید", report.kpis.newCustomers]);
  rows.push([]);
  rows.push(["پرفروش‌ترین محصولات"]);
  rows.push(["ردیف", "نام محصول", "SKU", "تعداد فروخته‌شده", "درآمد (ریال)"]);
  report.topProducts.forEach((product, index) => {
    rows.push([index + 1, product.name, product.sku, product.quantity, Math.round(product.revenue)]);
  });
  rows.push([]);
  rows.push(["پردرآمدترین دسته‌بندی‌ها"]);
  rows.push(["ردیف", "نام دسته", "درآمد (ریال)", "سهم درصدی"]);
  report.topCategories.forEach((category, index) => {
    rows.push([index + 1, category.name, Math.round(category.revenue), `${category.share.toFixed(1)}%`]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
