import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductStatus } from "@generated/prisma/enums";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { auditRequestContext } from "@/modules/audit/request-context";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ status: z.enum(Object.values(ProductStatus) as [ProductStatus, ...ProductStatus[]]) });

/**
 * Publish / unpublish / archive a single product. The bulk endpoint can do the same thing, but
 * a row-level toggle deserves its own audit action instead of being recorded as a bulk update.
 */
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const { status } = bodySchema.parse(await request.json().catch(() => null));

    const product = await db.product.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    if (product.status === status) return NextResponse.json({ id: product.id, status: product.status });

    await db.$transaction(async (transaction) => {
      await transaction.product.update({ where: { id }, data: { status } });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PRODUCT_STATUS_UPDATE",
          entityType: "Product",
          entityId: id,
          ...auditRequestContext(request, { name: product.name, from: product.status, to: status }),
        },
      });
    });

    return NextResponse.json({ id, status });
  } catch (error) {
    return apiError(error);
  }
}
