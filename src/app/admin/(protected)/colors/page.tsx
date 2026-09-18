import { BlueprintColorsView } from "@/components/admin/blueprint/colors-view";
import { db } from "@/lib/db";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ColorsPage() {
  await requirePermission("catalog:manage");
  const [colors, initialHiddenColumns] = await Promise.all([
    db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    readHiddenColumns("colors"),
  ]);
  return <BlueprintColorsView colors={colors} initialHiddenColumns={initialHiddenColumns} />;
}
