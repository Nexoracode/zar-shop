import { Plus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintPackagingView } from "@/components/admin/blueprint/packaging-view";
import { db } from "@/lib/db";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function PackagingPage() {
  await requirePermission("settings:manage");
  const [boxes, initialHiddenColumns] = await Promise.all([
    db.packagingBox.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    readHiddenColumns("packagingBoxes"),
  ]);
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
    <BlueprintPackagingView boxes={rows} initialHiddenColumns={initialHiddenColumns} />
  </>;
}
