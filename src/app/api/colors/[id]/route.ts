import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { updateColorSchema } from "@/modules/colors/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateColorSchema.parse(await request.json());
    const color = await db.$transaction(async (tx) => {
      const updated = await tx.color.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "COLOR_UPDATE", entityType: "Color", entityId: id, ...auditRequestContext(request, { name: updated.name, hex: updated.hex, changedFields: Object.keys(input) }) } });
      return updated;
    });
    return NextResponse.json(color);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ message: "رنگی با این نام قبلاً ثبت شده است." }, { status: 409 });
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const color = await db.color.findUnique({ where: { id }, select: { name: true, hex: true } });
    await db.$transaction(async (tx) => {
      await tx.color.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "COLOR_DELETE", entityType: "Color", entityId: id, ...auditRequestContext(request, { name: color?.name, hex: color?.hex }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
