import { ClassicColorsView } from "@/components/admin/classic/colors-view";
import { BlueprintColorsView } from "@/components/admin/blueprint/colors-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function ColorsPage() {
  await requirePermission("catalog:manage");
  const [colors, brandSettings] = await Promise.all([
    db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getBrandSettings(),
  ]);
  return brandSettings.adminTemplate === "BLUEPRINT"
    ? <BlueprintColorsView colors={colors} />
    : <ClassicColorsView colors={colors} />;
}
