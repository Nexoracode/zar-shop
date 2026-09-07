import { notFound } from "next/navigation";
import { BlueprintPromotionForm } from "@/components/admin/blueprint/promotion-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { serializePromotion } from "@/modules/promotions/admin";

type Context = { params: Promise<{ id: string }> };

export default async function EditPromotionPage({ params }: Context) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const promotion = await db.promotion.findUnique({ where: { id }, include: { _count: { select: { redemptions: true, rewards: true } } } });
  if (!promotion) notFound();
  const serialized = serializePromotion(promotion);

  const [categories, targetProducts, targetUsers] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } }),
    serialized.targetProductIds.length
      ? db.product.findMany({ where: { id: { in: serialized.targetProductIds } }, select: { id: true, name: true, sku: true } })
      : Promise.resolve([]),
    serialized.targetUserIds.length
      ? db.user.findMany({ where: { id: { in: serialized.targetUserIds } }, select: { id: true, firstName: true, lastName: true, phone: true } })
      : Promise.resolve([]),
  ]);
  return (
    <BlueprintPromotionForm
      promotion={serialized}
      categories={categories}
      initialTargetProducts={targetProducts}
      initialTargetUsers={targetUsers.map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام",
        phone: user.phone,
      }))}
    />
  );
}
