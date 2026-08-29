import { BlueprintBrandsView } from "@/components/admin/blueprint/brands-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function BrandsPage() {
  await requirePermission("catalog:manage");
  const brands = await db.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { logo: { select: { url: true, alt: true } }, _count: { select: { products: true } } },
  });
  return <BlueprintBrandsView brands={brands} />;
}
