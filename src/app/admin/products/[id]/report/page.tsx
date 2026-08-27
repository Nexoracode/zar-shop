import { notFound } from "next/navigation";
import { Boxes, CircleDollarSign, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { formatMoney } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin-ui";
import { BpKicker } from "@/components/admin/blueprint/ui/card";

type Context = { params: Promise<{ id: string }> };

/** An order actually became a sale once it was paid — not while it is still pending, expired,
 * cancelled, or refunded back out. */
const SOLD_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function ProductReportPage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, name: true, sku: true, stock: true, variants: { select: { stock: true } } },
  });
  if (!product) notFound();

  const soldItems = await db.orderItem.findMany({
    where: { productId: id, order: { status: { in: [...SOLD_STATUSES] } } },
    select: { quantity: true, total: true },
  });
  const salesCount = soldItems.reduce((sum, item) => sum + item.quantity, 0);
  const revenue = soldItems.reduce((sum, item) => sum + Number(item.total), 0);
  const remainingStock = product.variants.length
    ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
    : product.stock;

  const kpis = [
    { label: "تعداد فروش", value: salesCount.toLocaleString("fa-IR"), hint: "مجموع تعداد فروخته‌شده در سفارش‌های موفق", icon: ShoppingBag },
    { label: "درآمد", value: formatMoney(revenue), hint: "مجموع مبلغ این محصول در سفارش‌های موفق", icon: CircleDollarSign },
    { label: "موجودی باقی‌مانده", value: remainingStock.toLocaleString("fa-IR"), hint: product.variants.length ? "مجموع موجودی همه ترکیب‌ها" : "موجودی انبار", icon: Boxes },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow={`محصول ${product.sku}`}
        title={`خلاصه فروش «${product.name}»`}
        description="تعداد فروش، درآمد و موجودی باقی‌مانده این محصول را از یک‌جا ببینید."
        backHref={`/admin/products/${product.id}/edit`}
        backLabel="بازگشت به فرم محصول"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {kpis.map(({ label, value, hint, icon: Icon }) => (
          <section key={label} className="bp-frame relative p-[18px]">
            <div className="flex items-start justify-between gap-3">
              <BpKicker>{label}</BpKicker>
              <Icon size={17} strokeWidth={1.5} className="flex-none text-[var(--bp-accent)]" />
            </div>
            <strong className="mt-2 block truncate text-[26px] font-bold tracking-[-0.02em]">{value}</strong>
            <p className="bp-muted mb-0 mt-1 text-[11px]">{hint}</p>
          </section>
        ))}
      </div>
    </>
  );
}
