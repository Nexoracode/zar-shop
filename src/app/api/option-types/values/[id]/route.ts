import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

async function requireCatalogManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "catalog:manage") ? actor : null;
}

/**
 * Removes a single value from its type, without touching the rest of the type's library entry.
 *
 * Mirrors `updateOptionType`'s own value diffing: the `OptionValue` → `ProductOptionValue`
 * cascade drops the value from every product that offered it, the same way omitting it from the
 * full type-edit form already does.
 */
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireCatalogManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const value = await db.optionValue.findUnique({ where: { id }, select: { label: true, typeId: true } });
    if (!value) return new NextResponse(null, { status: 204 });
    await db.$transaction(async (tx) => {
      await tx.optionValue.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "OPTION_VALUE_DELETE", entityType: "OptionValue", entityId: id, ...auditRequestContext(request, { label: value.label, typeId: value.typeId }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
