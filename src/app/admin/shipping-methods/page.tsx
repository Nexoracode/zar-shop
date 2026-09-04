import { Plus } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink } from "@/components/admin-ui";
import { ShippingMethodTable } from "@/components/shipping-method-table";
import { BlueprintShippingMethodsView } from "@/components/admin/blueprint/shipping-methods-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function ShippingMethodsPage() {
  await requirePermission("orders:manage");
  const [methods, brandSettings] = await Promise.all([
    db.shippingMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: { _count: { select: { zones: true, orders: true } } },
    }),
    getBrandSettings(),
  ]);
  const rows = methods.map((method) => ({
    id: method.id,
    title: method.title,
    carrier: method.carrier,
    source: method.source,
    estimatedDays: method.estimatedDays,
    isActive: method.isActive,
    zoneCount: method._count.zones,
    orderCount: method._count.orders,
    sortOrder: method.sortOrder,
  }));
  return <>
    <AdminPageHeader
      eyebrow="ارسال و تحویل"
      title="روش‌های ارسال"
      description="گزینه‌هایی که مشتری در تسویه حساب می‌بیند، همراه با نرخ لحظه‌ای یا جدول نرخ خودتان."
      backHref="/admin/settings/commerce"
      backLabel="بازگشت به تنظیمات ارسال"
      action={<AdminPrimaryLink href="/admin/shipping-methods/new"><Plus size={17} />روش جدید</AdminPrimaryLink>}
    />
    {brandSettings.adminTemplate === "BLUEPRINT" ? (
      <BlueprintShippingMethodsView methods={rows} />
    ) : (
      <AdminPanel>
        {rows.length
          ? <ShippingMethodTable methods={rows} />
          : <AdminEmptyState title="روش ارسالی ثبت نشده" description="تا وقتی هیچ روشی تعریف نشده باشد، تسویه حساب همان هزینه ثابت تنظیمات را اعمال می‌کند." />}
      </AdminPanel>
    )}
  </>;
}
