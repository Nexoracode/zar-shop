import { Plus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintPackagingView } from "@/components/admin/blueprint/packaging-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function PackagingPage() {
  await requirePermission("settings:manage");
  const boxes = await db.packagingBox.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const rows = boxes.map((box) => ({
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
  }));
  return <>
    <AdminPageHeader
      eyebrow="ارسال و تحویل"
      title="بسته‌بندی"
      description="جعبه‌های ارسال را تعریف کنید تا هزینه ارسال بر اساس اندازه واقعی بسته دقیق‌تر محاسبه شود."
      backHref="/admin/shipping-methods"
      backLabel="بازگشت به روش‌های ارسال"
      action={<AdminPrimaryLink href="/admin/packaging/new"><Plus size={17} />افزودن جعبه</AdminPrimaryLink>}
    />
    <BlueprintPackagingView boxes={rows} />
  </>;
}
