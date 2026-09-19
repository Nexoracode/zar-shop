import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { packagingBoxSchema } from "@/modules/shipping/packaging-schemas";

/** Packaging is store-wide fulfilment config, so it follows the settings permission. */
async function settingsManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "settings:manage") ? actor : null;
}

export async function GET() {
  const actor = await settingsManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const items = await db.packagingBox.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const actor = await settingsManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const data = packagingBoxSchema.parse(await request.json());
    const created = await db.$transaction(async (tx) => {
      // The store must always have a default: the first box (or any box created while none is left) becomes it.
      const hasDefault = (await tx.packagingBox.count({ where: { isDefault: true, isActive: true } })) > 0;
      const asDefault = data.isDefault || !hasDefault;
      // One default at a time: a new default box demotes whichever box held the flag before.
      if (asDefault) await tx.packagingBox.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      const row = await tx.packagingBox.create({ data: { ...data, isDefault: asDefault, isActive: asDefault ? true : data.isActive } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PACKAGING_BOX_CREATE", entityType: "PackagingBox", entityId: row.id, ...auditRequestContext(request, { name: row.name, maxWeightGrams: row.maxWeightGrams }) } });
      return row;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
