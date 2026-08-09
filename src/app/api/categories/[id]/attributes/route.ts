import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { categoryAttributeSchema, parseCategoryAttributeSchema, parseProductAttributes } from "@/modules/products/attributes";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const { id } = await context.params;
  const category = await db.category.findUnique({ where: { id }, select: { id: true, name: true, attributeSchema: true } });
  if (!category) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });
  return NextResponse.json({ id: category.id, name: category.name, groups: parseCategoryAttributeSchema(category.attributeSchema) });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const groups = categoryAttributeSchema.parse(await request.json());
    const category = await db.category.findUnique({ where: { id }, select: { id: true, attributeSchema: true, products: { select: { attributes: true } } } });
    if (!category) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });

    const nextAttributeIds = new Set(groups.flatMap((group) => group.attributes.map((attribute) => attribute.id)));
    const usedAttributeIds = new Set(category.products.flatMap((product) => parseProductAttributes(product.attributes).map((attribute) => attribute.attributeId)));
    const removedUsedIds = [...usedAttributeIds].filter((attributeId) => !nextAttributeIds.has(attributeId));
    if (removedUsedIds.length) {
      const previous = parseCategoryAttributeSchema(category.attributeSchema);
      const names = previous.flatMap((group) => group.attributes).filter((attribute) => removedUsedIds.includes(attribute.id)).map((attribute) => attribute.name);
      return NextResponse.json({ message: `ویژگی‌های «${names.join("، ")}» در محصولات استفاده شده‌اند؛ ابتدا مقدار آن‌ها را از محصولات حذف کنید.` }, { status: 409 });
    }

    await db.$transaction([
      db.category.update({ where: { id }, data: { attributeSchema: groups } }),
      db.auditLog.create({ data: { actorId: actor.id, action: "CATEGORY_ATTRIBUTES_UPDATE", entityType: "Category", entityId: id, metadata: { groupCount: groups.length, attributeCount: groups.reduce((sum, group) => sum + group.attributes.length, 0) } } }),
    ]);
    return NextResponse.json({ groups });
  } catch (error) {
    return apiError(error);
  }
}
