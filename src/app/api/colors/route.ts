import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { colorSchema } from "@/modules/colors/schemas";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const items = await db.color.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = colorSchema.parse(await request.json());
    const color = await db.$transaction(async (tx) => {
      const created = await tx.color.create({ data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "COLOR_CREATE", entityType: "Color", entityId: created.id } });
      return created;
    });
    return NextResponse.json(color, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ message: "رنگی با این نام قبلاً ثبت شده است." }, { status: 409 });
    return apiError(error);
  }
}
