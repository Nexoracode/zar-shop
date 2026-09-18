import { BlueprintBrandsView } from "@/components/admin/blueprint/brands-view";
import { db } from "@/lib/db";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function BrandsPage() {
  await requirePermission("catalog:manage");
  const [brands, initialHiddenColumns] = await Promise.all([
    db.brand.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { logo: { select: { id: true, url: true, alt: true } }, _count: { select: { products: true } } },
    }),
    readHiddenColumns("brands"),
  ]);
  return <BlueprintBrandsView brands={brands} initialHiddenColumns={initialHiddenColumns} />;
}
