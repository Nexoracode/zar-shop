import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { OptionTypeForm } from "@/components/option-type-form";
import { db } from "@/lib/db";
import { getOptionType } from "@/modules/options/option-library";
import { requirePermission } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export default async function EditOptionTypePage({ params }: Context) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const [type, colors] = await Promise.all([
    getOptionType(id),
    db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!type) notFound();

  return <>
    <AdminPageHeader
      eyebrow="مدیریت کاتالوگ"
      title={`ویرایش «${type.name}»`}
      description="مقادیر این نوع را ویرایش کنید؛ حذف یک مقدار، آن را از محصولاتی که از آن استفاده می‌کنند نیز برمی‌دارد."
      backHref="/admin/option-types"
      backLabel="بازگشت به انواع تنوع"
    />
    <OptionTypeForm
      colors={colors}
      type={{
        id: type.id,
        name: type.name,
        kind: type.kind,
        isActive: type.isActive,
        sortOrder: type.sortOrder,
        values: type.values.map((value) => ({ id: value.id, label: value.label, colorId: value.colorId, isActive: value.isActive })),
      }}
    />
  </>;
}
