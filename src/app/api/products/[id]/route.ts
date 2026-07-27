import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productSchema } from "@/modules/products/schemas";
import { hasPermission } from "@/modules/auth/permissions";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const { mediaIds, ...input } = productSchema.partial().parse(await request.json());
    if (mediaIds) {
      const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "PRODUCT" }, select: { id: true } }) : [];
      if (media.length !== new Set(mediaIds).size) return NextResponse.json({ message: "یک یا چند رسانه محصول معتبر نیست." }, { status: 422 });
    }
    const product = await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: input });
      if (mediaIds) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        if (mediaIds.length) await tx.productMedia.createMany({ data: mediaIds.map((mediaId, position) => ({ productId: id, mediaId, position, isCover: position === 0 })) });
      }
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_UPDATE", entityType: "Product", entityId: id } });
      return tx.product.findUniqueOrThrow({ where: { id }, include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true } });
    });
    return NextResponse.json(product);
  } catch (error) { return apiError(error); }
}
