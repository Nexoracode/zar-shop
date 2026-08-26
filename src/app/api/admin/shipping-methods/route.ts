import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auditRequestContext } from "@/modules/audit/request-context";
import { hasPermission } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/session";
import { shippingMethodSchema } from "@/modules/shipping/schemas";

/** Delivery options belong to how orders are fulfilled, so they follow the orders permission. */
async function orderManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "orders:manage") ? actor : null;
}

export async function GET() {
  const actor = await orderManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const items = await db.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { zones: { orderBy: { maxWeightGrams: "asc" }, include: { province: { select: { name: true } } } } },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const actor = await orderManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = shippingMethodSchema.parse(await request.json());
    const { zones, ...method } = input;
    const created = await db.$transaction(async (tx) => {
      const row = await tx.shippingMethod.create({ data: { ...method, zones: { create: zones } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "SHIPPING_METHOD_CREATE", entityType: "ShippingMethod", entityId: row.id, ...auditRequestContext(request, { title: row.title, carrier: row.carrier, source: row.source, zoneCount: zones.length }) } });
      return row;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
