import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { ShippingMethodForm } from "@/components/shipping-method-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function EditShippingMethodPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const [method, provinces] = await Promise.all([
    db.shippingMethod.findUnique({ where: { id }, include: { zones: { orderBy: { maxWeightGrams: "asc" } } } }),
    db.province.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!method) notFound();
  return <>
    <AdminPageHeader
      eyebrow="ارسال و تحویل"
      title={`ویرایش «${method.title}»`}
      description="تغییر نام، شرکت حمل، منبع نرخ و جدول نرخ این روش."
      backHref="/admin/shipping-methods"
      backLabel="بازگشت به روش‌های ارسال"
    />
    <ShippingMethodForm
      provinces={provinces}
      method={{
        id: method.id,
        title: method.title,
        carrier: method.carrier,
        source: method.source,
        rateType: method.rateType,
        orderType: method.orderType,
        estimatedDays: method.estimatedDays,
        isActive: method.isActive,
        sortOrder: method.sortOrder,
        zones: method.zones.map((zone) => ({ provinceId: zone.provinceId, maxWeightGrams: zone.maxWeightGrams, price: Number(zone.price) })),
      }}
    />
  </>;
}
