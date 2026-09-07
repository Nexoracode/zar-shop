import { BlueprintOptionTypesView } from "@/components/admin/blueprint/option-types-view";
import { db } from "@/lib/db";
import { listOptionTypes } from "@/modules/options/option-library";
import { requirePermission } from "@/modules/auth/session";

export default async function OptionTypesPage() {
  await requirePermission("catalog:manage");
  const [types, colors] = await Promise.all([
    listOptionTypes(),
    db.color.findMany({ where: { isActive: true }, select: { id: true, name: true, hex: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const items = types.map((type) => ({
    id: type.id,
    name: type.name,
    kind: type.kind,
    isActive: type.isActive,
    sortOrder: type.sortOrder,
    productCount: type._count.products,
    values: type.values.map((value) => ({ id: value.id, label: value.label, colorId: value.colorId, hex: value.color?.hex ?? null, isActive: value.isActive })),
  }));
  return <BlueprintOptionTypesView types={items} colors={colors} />;
}
