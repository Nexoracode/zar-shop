import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { updateOptionTypeSchema } from "@/modules/options/schemas";
import { updateOptionType } from "@/modules/options/option-library";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

async function requireCatalogManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "catalog:manage") ? actor : null;
}

export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireCatalogManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateOptionTypeSchema.parse(await request.json());
    const updated = await updateOptionType(id, input);
    await db.auditLog.create({ data: { actorId: actor.id, action: "OPTION_TYPE_UPDATE", entityType: "OptionType", entityId: id, ...auditRequestContext(request, { name: updated.name, kind: updated.kind, values: updated.values.length }) } });
    return NextResponse.json(updated);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "نوع یا مقداری با این نام قبلاً ثبت شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireCatalogManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const type = await db.optionType.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
    if (!type) return new NextResponse(null, { status: 204 });
    // Deleting a type in use would silently strip combinations from live products, so the admin
    // is told to detach it from those products first.
    if (type._count.products > 0) {
      return NextResponse.json({ message: `این نوع تنوع در ${type._count.products} محصول استفاده شده است و حذف نمی‌شود.` }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.optionType.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "OPTION_TYPE_DELETE", entityType: "OptionType", entityId: id, ...auditRequestContext(request, { name: type.name }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
