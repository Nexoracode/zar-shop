import { BlueprintColorsView } from "@/components/admin/blueprint/colors-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function ColorsPage() {
  await requirePermission("catalog:manage");
  const colors = await db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <BlueprintColorsView colors={colors} />;
}
