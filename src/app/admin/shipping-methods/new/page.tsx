import { AdminPageHeader } from "@/components/admin-ui";
import { ShippingMethodForm } from "@/components/shipping-method-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function NewShippingMethodPage() {
  await requirePermission("orders:manage");
  const provinces = await db.province.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <>
    <AdminPageHeader
      eyebrow="ارسال و تحویل"
      title="روش ارسال جدید"
      description="نام، شرکت حمل، منبع نرخ و جدول نرخ این روش را تعریف کنید."
      backHref="/admin/shipping-methods"
      backLabel="بازگشت به روش‌های ارسال"
    />
    <ShippingMethodForm provinces={provinces} />
  </>;
}
