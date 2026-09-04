import { AdminPageHeader } from "@/components/admin-ui";
import { ShippingMethodForm } from "@/components/shipping-method-form";
import { BlueprintShippingMethodForm } from "@/components/admin/blueprint/shipping-method-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function NewShippingMethodPage() {
  await requirePermission("orders:manage");
  const [provinces, brandSettings] = await Promise.all([
    db.province.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getBrandSettings(),
  ]);
  return <>
    <AdminPageHeader
      eyebrow="ارسال و تحویل"
      title="روش ارسال جدید"
      description="نام، شرکت حمل، منبع نرخ و جدول نرخ این روش را تعریف کنید."
      backHref="/admin/shipping-methods"
      backLabel="بازگشت به روش‌های ارسال"
    />
    {brandSettings.adminTemplate === "BLUEPRINT"
      ? <BlueprintShippingMethodForm provinces={provinces} />
      : <ShippingMethodForm provinces={provinces} />}
  </>;
}
