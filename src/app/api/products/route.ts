import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { completeProductSchema } from "@/modules/products/schemas";
import { hasPermission } from "@/modules/auth/permissions";
import { areOptionColorsValid } from "@/modules/products/color-validation";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { tehranDateEnd, tehranDateStart } from "@/modules/products/discount";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";

export async function GET() {
  const [settings, user] = await Promise.all([getGeneralStoreSettings(), getCurrentUser()]);
  if (!isStorefrontAvailable(settings, user?.role)) return NextResponse.json({ message: "فروشگاه موقتاً در دسترس نیست." }, { status: 503 });
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, options: { orderBy: { position: "asc" } }, optionGuide: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }
    const { mediaIds, options, optionGuideId, ...input } = completeProductSchema.parse({ ...(await request.json()), storeIndustry: "GOLD" });
    if (!await areOptionColorsValid(options)) return NextResponse.json({ message: "یک یا چند رنگ انتخاب‌شده معتبر یا فعال نیست." }, { status: 422 });
    const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "PRODUCT", type: { in: ["IMAGE", "VIDEO"] } }, select: { id: true } }) : [];
    if (media.length !== new Set(mediaIds).size) return NextResponse.json({ message: "یک یا چند رسانه محصول معتبر نیست." }, { status: 422 });
    if (optionGuideId) {
      const guide = await db.mediaAsset.findFirst({ where: { id: optionGuideId, scope: "PRODUCT", type: { in: ["IMAGE", "DOCUMENT"] } }, select: { id: true } });
      if (!guide) return NextResponse.json({ message: "فایل راهنمای انتخاب باید تصویر یا PDF معتبر از گالری محصولات باشد." }, { status: 422 });
    }
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...input, discountStartsAt: tehranDateStart(input.discountStartsAt), discountEndsAt: tehranDateEnd(input.discountEndsAt), description: sanitizeProductDescription(input.description), optionGuideId, options: { create: options.map((option, position) => ({ ...option, position })) } } });
      if (mediaIds.length) await tx.productMedia.createMany({ data: mediaIds.map((mediaId, position) => ({ productId: created.id, mediaId, position, isCover: position === 0 })) });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_CREATE", entityType: "Product", entityId: created.id } });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, options: { orderBy: { position: "asc" } }, optionGuide: true } });
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) { return apiError(error); }
}
