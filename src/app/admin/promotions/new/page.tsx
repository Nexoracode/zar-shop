import { BlueprintPromotionForm } from "@/components/admin/blueprint/promotion-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function NewPromotionPage() {
  await requirePermission("orders:manage");
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } });
  return <BlueprintPromotionForm categories={categories} />;
}
