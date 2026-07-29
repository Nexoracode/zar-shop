import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productSchema } from "@/modules/products/schemas";
import { hasPermission } from "@/modules/auth/permissions";
import { areOptionColorsValid } from "@/modules/products/color-validation";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { mergeOptionsPreservingHistory, optionEntries, optionSelectionKey } from "@/modules/products/options";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const existingProduct = await db.product.findUnique({ where: { id }, select: { storeIndustry: true } });
    if (!existingProduct) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    const { mediaIds, options, optionGuideId, storeIndustry: _ignoredIndustry, ...input } = productSchema.partial().parse(await request.json());
    void _ignoredIndustry;
    if (existingProduct.storeIndustry === "GOLD" && options?.some((option) => option.values.some((item) => item.price !== null))) {
      return NextResponse.json({ message: "برای محصول طلا، قیمت تنوع از وزن آن محاسبه می‌شود." }, { status: 422 });
    }
    if (existingProduct.storeIndustry === "GENERAL" && options?.some((option) => option.values.some((item) => item.weightGrams !== null))) {
      return NextResponse.json({ message: "برای محصول معمولی، به‌جای وزن قیمت مستقیم تنوع را وارد کنید." }, { status: 422 });
    }
    if (existingProduct.storeIndustry === "GENERAL" && input.fixedPrice === null) {
      return NextResponse.json({ message: "قیمت محصول را وارد کنید." }, { status: 422 });
    }
    if (options && !await areOptionColorsValid(options)) return NextResponse.json({ message: "یک یا چند رنگ انتخاب‌شده معتبر یا فعال نیست." }, { status: 422 });
    if (mediaIds) {
      const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "PRODUCT", type: { in: ["IMAGE", "VIDEO"] } }, select: { id: true } }) : [];
      if (media.length !== new Set(mediaIds).size) return NextResponse.json({ message: "یک یا چند رسانه محصول معتبر نیست." }, { status: 422 });
    }
    if (optionGuideId) {
      const guide = await db.mediaAsset.findFirst({ where: { id: optionGuideId, scope: "PRODUCT", type: { in: ["IMAGE", "DOCUMENT"] } }, select: { id: true } });
      if (!guide) return NextResponse.json({ message: "فایل راهنمای انتخاب باید تصویر یا PDF معتبر از گالری محصولات باشد." }, { status: 422 });
    }
    const product = await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { ...input, ...(input.description !== undefined ? { description: sanitizeProductDescription(input.description) } : {}), ...(optionGuideId !== undefined ? { optionGuideId } : {}) } });
      if (mediaIds) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        if (mediaIds.length) await tx.productMedia.createMany({ data: mediaIds.map((mediaId, position) => ({ productId: id, mediaId, position, isCover: position === 0 })) });
      }
      if (options) {
        const existingOptions = await tx.productOption.findMany({ where: { productId: id }, select: { name: true, values: true } });
        const orderItems = await tx.orderItem.findMany({ where: { productId: id }, select: { selectedOptions: true } });
        const usedSelectionKeys = new Set(orderItems.flatMap((item) => optionEntries(item.selectedOptions).map(([name, value]) => optionSelectionKey(name, value))));
        const safeOptions = mergeOptionsPreservingHistory(existingOptions, options, usedSelectionKeys);
        await tx.productOption.deleteMany({ where: { productId: id } });
        if (safeOptions.length) await tx.productOption.createMany({ data: safeOptions.map((option, position) => ({ productId: id, ...option, position })) });
      }
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_UPDATE", entityType: "Product", entityId: id } });
      return tx.product.findUniqueOrThrow({ where: { id }, include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, options: { orderBy: { position: "asc" } }, optionGuide: true } });
    });
    return NextResponse.json(product);
  } catch (error) { return apiError(error); }
}
