import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintPackagingBoxForm } from "@/components/admin/blueprint/packaging-box-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function EditPackagingBoxPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const box = await db.packagingBox.findUnique({ where: { id } });
  if (!box) notFound();
  const editableBox = {
    id: box.id,
    name: box.name,
    lengthCm: Number(box.lengthCm),
    widthCm: Number(box.widthCm),
    heightCm: Number(box.heightCm),
    weightGrams: box.weightGrams,
    maxWeightGrams: box.maxWeightGrams,
    tapinBoxId: box.tapinBoxId,
    isDefault: box.isDefault,
    isActive: box.isActive,
  };
  return <>
    <AdminPageHeader
      eyebrow="بسته‌بندی"
      title={`ویرایش: ${box.name}`}
      description="تغییر اندازه، وزن و ظرفیت این جعبه ارسال."
      backHref="/admin/packaging"
      backLabel="بازگشت به بسته‌بندی"
    />
    <BlueprintPackagingBoxForm box={editableBox} />
  </>;
}
