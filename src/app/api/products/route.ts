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
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import { validateProductAttributes } from "@/modules/products/attributes";
import { parseOptionValues } from "@/modules/products/options";
import { auditRequestContext } from "@/modules/audit/request-context";
import { buildAuditChanges, productAuditSnapshot } from "@/modules/audit/product-audit";

export async function GET() {
  const [settings, user, catalogSettings] = await Promise.all([getGeneralStoreSettings(), getCurrentUser(), getCatalogSettings()]);
  if (!isStorefrontAvailable(settings, user?.role)) return NextResponse.json({ message: "فروشگاه موقتاً در دسترس نیست." }, { status: 503 });
  const products = await db.product.findMany({
    where: { status: "ACTIVE", storeIndustry: settings.industry, ...(catalogSettings.hideOutOfStockProducts ? { stock: { gt: 0 } } : {}) },
    include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, variants: true, optionGuide: true },
    orderBy: { createdAt: "desc" },
  });
  const colorIds = [...new Set(products.flatMap((product) => product.options.flatMap((option) => parseOptionValues(option.values).flatMap((value) => value.colorId ? [value.colorId] : []))))];
  const colors = colorIds.length ? await db.color.findMany({ where: { id: { in: colorIds }, isActive: true }, select: { id: true, name: true, hex: true } }) : [];
  const colorsById = new Map(colors.map((color) => [color.id, color]));
  return NextResponse.json(products.map((product) => ({ ...product, options: product.options.map((option) => {
    const values = parseOptionValues(option.values);
    return { ...option, kind: option.type, values: values.map((value) => ({ ...value, color: value.colorId ? colorsById.get(value.colorId) ?? null : null })) };
  }) })));
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) {
      return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    }
    const storeIndustry = await getStoreIndustry();
    const { mediaIds, options, optionGuideId, attributes, ...input } = completeProductSchema.parse({ ...(await request.json()), storeIndustry });
    const category = input.categoryId ? await db.category.findUnique({ where: { id: input.categoryId }, select: { attributeSchema: true } }) : null;
    if (input.categoryId && !category) return NextResponse.json({ message: "دسته‌بندی انتخاب‌شده پیدا نشد." }, { status: 422 });
    const attributeValidation = validateProductAttributes(category?.attributeSchema ?? [], attributes);
    if (!attributeValidation.ok) return NextResponse.json({ message: attributeValidation.message }, { status: 422 });
    if (!await areOptionColorsValid(options)) return NextResponse.json({ message: "یک یا چند رنگ انتخاب‌شده معتبر یا فعال نیست." }, { status: 422 });
    const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, scope: "PRODUCT", type: { in: ["IMAGE", "VIDEO"] } }, select: { id: true } }) : [];
    if (media.length !== new Set(mediaIds).size) return NextResponse.json({ message: "یک یا چند رسانه محصول معتبر نیست." }, { status: 422 });
    if (optionGuideId) {
      const guide = await db.mediaAsset.findFirst({ where: { id: optionGuideId, scope: "PRODUCT", type: { in: ["IMAGE", "DOCUMENT"] } }, select: { id: true } });
      if (!guide) return NextResponse.json({ message: "فایل راهنمای انتخاب باید تصویر یا PDF معتبر از گالری محصولات باشد." }, { status: 422 });
    }
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...input, attributes: attributeValidation.data, discountStartsAt: tehranDateStart(input.discountStartsAt), discountEndsAt: tehranDateEnd(input.discountEndsAt), description: sanitizeProductDescription(input.description), optionGuideId, options: { create: options.map((option, position) => ({ ...option, position })) } } });
      if (mediaIds.length) await tx.productMedia.createMany({ data: mediaIds.map((mediaId, position) => ({ productId: created.id, mediaId, position, isCover: position === 0 })) });
      const result = await tx.product.findUniqueOrThrow({ where: { id: created.id }, include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, variants: true, optionGuide: true } });
      const after = productAuditSnapshot(result);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_CREATE", entityType: "Product", entityId: created.id, ...auditRequestContext(request, {
        subject: { id: result.id, type: "Product", name: result.name, sku: result.sku },
        summary: `محصول «${result.name}» اضافه شد.`,
        changes: buildAuditChanges({}, after),
        before: null,
        after,
      }) } });
      return result;
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) { return apiError(error); }
}
