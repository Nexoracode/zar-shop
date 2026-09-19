import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { defaultBoxChangeBlocker } from "@/modules/shipping/packaging";
import { packagingBoxSchema } from "@/modules/shipping/packaging-schemas";

type Context = { params: Promise<{ id: string }> };

async function settingsManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "settings:manage") ? actor : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await settingsManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const data = packagingBoxSchema.parse(await request.json());
    const existing = await db.packagingBox.findUnique({ where: { id }, select: { id: true, isDefault: true } });
    if (!existing) return NextResponse.json({ message: "جعبه بسته‌بندی پیدا نشد." }, { status: 404 });
    const blocked = defaultBoxChangeBlocker(existing, data);
    if (blocked) return NextResponse.json({ message: blocked }, { status: 422 });

    await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.packagingBox.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      await tx.packagingBox.update({ where: { id }, data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PACKAGING_BOX_UPDATE", entityType: "PackagingBox", entityId: id, ...auditRequestContext(request, { name: data.name, maxWeightGrams: data.maxWeightGrams }) } });
    });
    return NextResponse.json({ id });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await settingsManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const box = await db.packagingBox.findUnique({ where: { id }, select: { id: true, name: true, isDefault: true } });
    if (!box) return NextResponse.json({ message: "جعبه بسته‌بندی پیدا نشد." }, { status: 404 });
    if (box.isDefault) return NextResponse.json({ message: "جعبه پیش‌فرض قابل حذف نیست؛ ابتدا جعبه دیگری را پیش‌فرض کنید." }, { status: 409 });
    await db.$transaction(async (tx) => {
      await tx.packagingBox.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PACKAGING_BOX_DELETE", entityType: "PackagingBox", entityId: id, ...auditRequestContext(request, { name: box.name }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
