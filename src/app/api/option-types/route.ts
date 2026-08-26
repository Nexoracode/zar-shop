import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { optionTypeSchema, quickOptionValueSchema } from "@/modules/options/schemas";
import { createOptionType, listOptionTypes } from "@/modules/options/option-library";
import { auditRequestContext } from "@/modules/audit/request-context";

async function requireCatalogManager() {
  const actor = await getCurrentUser();
  return actor && hasPermission(actor.role, "catalog:manage") ? actor : null;
}

export async function GET() {
  const actor = await requireCatalogManager();
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  return NextResponse.json({ items: await listOptionTypes() });
}

/**
 * Creates a type, or — with `typeId` — a single value inside one.
 *
 * The product form needs the second form so an admin can add «سفید» without leaving the product
 * they are in the middle of writing.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireCatalogManager();
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const body = await request.json();

    if (body && typeof body === "object" && "typeId" in body) {
      const input = quickOptionValueSchema.parse(body);
      const type = await db.optionType.findUnique({ where: { id: input.typeId }, select: { id: true, kind: true } });
      if (!type) return NextResponse.json({ message: "نوع تنوع انتخاب‌شده پیدا نشد." }, { status: 404 });
      if (type.kind === "COLOR" && !input.colorId) {
        return NextResponse.json({ message: "برای مقدارِ نوع رنگ، خود رنگ را نیز انتخاب کنید." }, { status: 422 });
      }
      const value = await db.optionValue.create({
        data: { typeId: type.id, label: input.label, colorId: type.kind === "COLOR" ? input.colorId : null },
        select: { id: true, label: true, colorId: true, color: { select: { id: true, name: true, hex: true } } },
      });
      return NextResponse.json(value, { status: 201 });
    }

    const input = optionTypeSchema.parse(body);
    const created = await createOptionType(input);
    await db.auditLog.create({ data: { actorId: actor.id, action: "OPTION_TYPE_CREATE", entityType: "OptionType", entityId: created.id, ...auditRequestContext(request, { name: created.name, kind: created.kind }) } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "نوع یا مقداری با این نام قبلاً ثبت شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
