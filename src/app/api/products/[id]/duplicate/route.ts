import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { writeVariantSetup, type ProductOptionTypeInput, type ProductVariantInput } from "@/modules/products/variant-write";
import { productOptionTypeInclude } from "@/modules/products/variant-selection";
import { auditRequestContext } from "@/modules/audit/request-context";
import { buildAuditChanges, productAuditSnapshot } from "@/modules/audit/product-audit";

type Context = { params: Promise<{ id: string }> };

/**
 * Copies a product wholesale — its own fields, media, option types and every combination —
 * without opening its edit page first. Same shape as the "duplicate" action already offered from
 * the form's own save menu, just reachable straight from the row instead.
 */
export async function POST(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!actor || !hasPermission(actor.role, "catalog:manage")) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const original = await db.product.findUnique({
      where: { id },
      include: { media: { orderBy: { position: "asc" } }, optionTypes: { include: { values: true } }, variants: true },
    });
    if (!original) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });

    const suffix = Math.random().toString(36).slice(2, 6);
    const { sku, slug, name, media, optionTypes, variants } = original;

    const duplicated = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeIndustry: original.storeIndustry,
          description: original.description,
          categoryId: original.categoryId,
          optionGuideId: original.optionGuideId,
          purity: original.purity,
          weightGrams: original.weightGrams,
          makingFeeType: original.makingFeeType,
          makingFeeValue: original.makingFeeValue,
          profitPercent: original.profitPercent,
          taxPercent: original.taxPercent,
          fixedPrice: original.fixedPrice,
          discountType: original.discountType,
          discountValue: original.discountValue,
          discountStartsAt: original.discountStartsAt,
          discountEndsAt: original.discountEndsAt,
          stock: original.stock,
          preparationDays: original.preparationDays,
          shippingWeightGrams: original.shippingWeightGrams,
          packageLengthCm: original.packageLengthCm,
          packageWidthCm: original.packageWidthCm,
          packageHeightCm: original.packageHeightCm,
          minOrderQuantity: original.minOrderQuantity,
          maxOrderQuantity: original.maxOrderQuantity,
          featured: original.featured,
          attributes: original.attributes ?? undefined,
          sku: `${sku}-${suffix}`,
          slug: `${slug}-${suffix}`,
          name: `${name} (کپی)`,
          status: "DRAFT",
        },
      });

      const optionTypesInput: ProductOptionTypeInput[] = optionTypes.map((type) => ({ typeId: type.typeId, valueIds: type.values.map((value) => value.valueId) }));
      const variantsInput: ProductVariantInput[] = variants.map((variant) => ({
        selection: variant.selection as Record<string, string>,
        price: variant.price?.toString() ?? null,
        weightGrams: variant.weightGrams?.toString() ?? null,
        discountType: variant.discountType,
        discountValue: variant.discountValue?.toString() ?? null,
        discountStartsAt: variant.discountStartsAt?.toISOString() ?? null,
        discountEndsAt: variant.discountEndsAt?.toISOString() ?? null,
        stock: variant.stock,
        isActive: variant.isActive,
      }));
      await writeVariantSetup(tx, created.id, optionTypesInput, variantsInput);

      if (media.length) {
        await tx.productMedia.createMany({ data: media.map((item) => ({ productId: created.id, mediaId: item.mediaId, position: item.position, isCover: item.isCover })) });
      }

      const result = await tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: { media: { include: { media: true }, orderBy: { position: "asc" } }, category: true, variants: { orderBy: { createdAt: "asc" } }, optionTypes: productOptionTypeInclude, optionGuide: true },
      });
      const after = productAuditSnapshot(result);
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_DUPLICATE", entityType: "Product", entityId: created.id, ...auditRequestContext(request, {
        subject: { id: result.id, type: "Product", name: result.name, sku: result.sku },
        summary: `محصول «${result.name}» از روی «${original.name}» تکثیر شد.`,
        changes: buildAuditChanges({}, after),
        before: null,
        after,
        duplicatedFrom: original.id,
      }) } });
      return result;
    });

    return NextResponse.json({ id: duplicated.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
