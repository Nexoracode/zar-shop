import { Plus } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPrimaryLink } from "@/components/admin-ui";
import { OptionTypeTable } from "@/components/option-type-table";
import { listOptionTypes } from "@/modules/options/option-library";
import { requirePermission } from "@/modules/auth/session";

export default async function OptionTypesPage() {
  await requirePermission("catalog:manage");
  const types = await listOptionTypes();
  const items = types.map((type) => ({
    id: type.id,
    name: type.name,
    kind: type.kind,
    isActive: type.isActive,
    sortOrder: type.sortOrder,
    productCount: type._count.products,
    values: type.values.map((value) => ({ id: value.id, label: value.label, hex: value.color?.hex ?? null })),
  }));

  return <>
    <AdminPageHeader
      eyebrow="مدیریت کاتالوگ"
      title="انواع تنوع"
      description="نوع‌هایی مانند رنگ و سایز را یک‌بار تعریف کنید تا در فرم هر محصول قابل انتخاب باشند."
      action={<AdminPrimaryLink href="/admin/option-types/new"><Plus size={17} />نوع تنوع جدید</AdminPrimaryLink>}
    />
    <AdminPanel>
      {items.length
        ? <OptionTypeTable types={items} />
        : <AdminEmptyState title="نوع تنوعی ثبت نشده" description="اولین نوع تنوع مانند رنگ یا سایز را با مقادیرش تعریف کنید." />}
    </AdminPanel>
  </>;
}
