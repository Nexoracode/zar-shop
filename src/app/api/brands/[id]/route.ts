import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { updateBrandSchema } from "@/modules/brands/schemas";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

const brandInclude = {
  logo: true,
  _count: { select: { products: true } },
} satisfies Prisma.BrandInclude;

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  if (includeInactive) {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  }
  const brand = await db.brand.findFirst({
    where: { id, ...(includeInactive ? {} : { isActive: true }) },
    include: brandInclude,
  });
  if (!brand) return NextResponse.json({ message: "برند پیدا نشد." }, { status: 404 });
  return NextResponse.json(brand);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateBrandSchema.parse(await request.json());

    const current = await db.brand.findUnique({ where: { id }, select: { id: true } });
    if (!current) return NextResponse.json({ message: "برند پیدا نشد." }, { status: 404 });

    if (input.logoId) {
      const logo = await db.mediaAsset.findUnique({ where: { id: input.logoId }, select: { type: true, scope: true } });
      if (!logo || logo.type !== "IMAGE" || logo.scope !== "PRODUCT_BRAND") return NextResponse.json({ message: "لوگوی برند معتبر نیست." }, { status: 422 });
    }

    const brand = await db.$transaction(async (tx) => {
      const updated = await tx.brand.update({ where: { id }, data: input, include: brandInclude });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "BRAND_UPDATE", entityType: "Brand", entityId: id, ...auditRequestContext(request, { name: updated.name, slug: updated.slug }) } });
      return updated;
    });
    return NextResponse.json(brand);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی برند قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const brand = await db.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) return NextResponse.json({ message: "برند پیدا نشد." }, { status: 404 });
    if (brand._count.products > 0) {
      return NextResponse.json({ message: "برند دارای محصول است و قابل حذف نیست." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.brand.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "BRAND_DELETE", entityType: "Brand", entityId: id, ...auditRequestContext(request, { name: brand.name, slug: brand.slug }) } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
