import { BlueprintPromotionForm } from "@/components/admin/blueprint/promotion-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NewPromotionPage() {
  await requirePermission("orders:manage");
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } });
  return <BlueprintPromotionForm categories={categories} />;
}
