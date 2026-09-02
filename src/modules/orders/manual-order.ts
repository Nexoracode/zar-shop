import { randomBytes } from "node:crypto";
import { hash as hashPassword } from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import { calculateDiscountedPrice } from "@/modules/products/discount";
import { findVariant, isVariantSnapshotValid, variantPricing } from "@/modules/products/variants";
import { InventoryUnavailableError, reserveInventory } from "@/modules/orders/inventory";
import { getOrderSettings, orderExpiresAt } from "@/modules/settings/order-settings";
import { estimatedReadyAt } from "@/modules/settings/commerce-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { chargeableCartWeight, quoteForMethod } from "@/modules/shipping/quote";
import { phoneSchema } from "@/modules/auth/schemas";

/*
 * Creating an order from the admin panel instead of the storefront checkout.
 *
 * The per-line pricing mirrors `/api/checkout` exactly — the gold rate is a fresh server-side
 * snapshot, and each line stores its own rawGold/makingFee/profit/tax so a later rate change
 * never moves this order. What the manual flow drops is the cart, the payment gateway and
 * promotions: the admin picks whether the order is already paid (cash/POS) or still awaiting
 * payment, and no coupon is applied.
 */

export class ManualOrderError extends Error {}

const nameField = z.string().trim().min(2, "نام باید حداقل ۲ نویسه باشد.").max(100);

export const manualOrderSchema = z.object({
  customer: z.union([
    z.object({ userId: z.string().cuid() }),
    z.object({ newCustomer: z.object({ firstName: nameField, lastName: nameField, phone: phoneSchema }) }),
  ]),
  items: z.array(z.object({
    productId: z.string().cuid(),
    selectionKey: z.string().max(64).default(""),
    quantity: z.number().int().min(1),
  })).min(1, "حداقل یک قلم به سفارش اضافه کنید."),
  delivery: z.union([
    z.object({ method: z.literal("STORE_PICKUP") }),
    z.object({
      method: z.literal("INSURED_SHIPPING"),
      shippingMethodId: z.union([z.null(), z.string().cuid()]).default(null),
      address: z.object({
        recipient: nameField,
        phone: phoneSchema,
        provinceId: z.string().cuid(),
        cityId: z.union([z.null(), z.string().cuid()]).default(null),
        province: z.string().trim().min(1).max(100),
        city: z.string().trim().min(1).max(100),
        postalCode: z.string().trim().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد."),
        addressLine: z.string().trim().min(5, "نشانی را کامل وارد کنید.").max(500),
      }),
    }),
  ]),
  payment: z.enum(["PAID", "PENDING"]),
  notes: z.string().trim().max(2000).optional(),
});

export type ManualOrderInput = z.infer<typeof manualOrderSchema>;

async function resolveCustomer(input: ManualOrderInput["customer"]) {
  if ("userId" in input) {
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { id: true, firstName: true, lastName: true, phone: true, isGuest: true } });
    if (!user) throw new ManualOrderError("مشتری انتخاب‌شده پیدا نشد.");
    return user;
  }
  const { firstName, lastName, phone } = input.newCustomer;
  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (existing) throw new ManualOrderError("کاربری با این شماره موبایل از قبل ثبت شده است؛ همان کاربر را انتخاب کنید.");
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"), 12);
  return db.user.create({
    data: { firstName, lastName, phone, passwordHash, isGuest: true },
    select: { id: true, firstName: true, lastName: true, phone: true, isGuest: true },
  });
}

/** Prices the lines and shipping the same way `createManualOrder` does, without creating anything —
 *  used by the create flow itself and by the quote endpoint so the two never drift. */
export async function priceManualOrder(input: Pick<ManualOrderInput, "items" | "delivery">) {
  const [orderSettings, generalSettings] = await Promise.all([getOrderSettings(), getGeneralStoreSettings()]);

  const products = await db.product.findMany({
    where: { id: { in: [...new Set(input.items.map((item) => item.productId))] } },
    include: { variants: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const needsGoldRate = input.items.some((item) => {
    const product = productById.get(item.productId);
    return product?.storeIndustry === "GOLD";
  });
  let rate = "0";
  if (needsGoldRate) {
    try {
      const gold = await getGoldPrice({ force: orderSettings.revalidateGoldAtCheckout });
      rate = gold.pricePerGram18.toString();
    } catch {
      throw new ManualOrderError("نرخ لحظه‌ای طلا در دسترس نیست؛ کمی بعد دوباره تلاش کنید.");
    }
  }

  const lines = input.items.map((entry) => {
    const product = productById.get(entry.productId);
    if (!product) throw new ManualOrderError("یکی از محصولات انتخاب‌شده پیدا نشد.");
    if (product.storeIndustry !== generalSettings.industry) throw new ManualOrderError(`نوع محصول «${product.name}» با قالب فعلی فروشگاه سازگار نیست.`);
    if (entry.quantity > orderSettings.maxOrderItemQuantity) throw new ManualOrderError(`حداکثر تعداد مجاز برای هر قلم ${orderSettings.maxOrderItemQuantity.toLocaleString("fa-IR")} عدد است.`);
    if (product.status !== "ACTIVE" || product.stock < entry.quantity) throw new ManualOrderError(`موجودی «${product.name}» کافی نیست.`);
    if (!isVariantSnapshotValid(product.variants, entry.selectionKey, entry.quantity)) throw new ManualOrderError(`تنوع انتخاب‌شده برای «${product.name}» غیرفعال یا ناموجود است.`);

    const variant = entry.selectionKey ? findVariant(product.variants, entry.selectionKey) : null;
    const resolved = variantPricing(variant, product);
    const parts = calculateProductPrice({
      goldPricePerGram18: rate,
      weightGrams: product.storeIndustry === "GOLD" ? resolved.weightGrams : 0,
      purity: product.purity,
      makingFeeType: product.makingFeeType,
      makingFeeValue: product.makingFeeValue,
      profitPercent: product.profitPercent,
      taxPercent: product.taxPercent,
    });
    const originalUnitPrice = product.storeIndustry === "GENERAL"
      ? resolved.fixedPrice ?? 0
      : resolved.fixedPrice ?? parts.total;
    const pricing = calculateDiscountedPrice(originalUnitPrice, {
      discountType: resolved.discountType,
      discountValue: resolved.discountValue,
      discountStartsAt: resolved.discountStartsAt,
      discountEndsAt: resolved.discountEndsAt,
    });
    const unitPrice = pricing.finalPrice;
    if (unitPrice <= 0) throw new ManualOrderError(`قیمت «${product.name}» معتبر نیست.`);
    const selectedOptions = variant && variant.selection && typeof variant.selection === "object" && !Array.isArray(variant.selection)
      ? (variant.selection as Record<string, string>)
      : undefined;

    return {
      product, entry, parts, resolved,
      selectedOptions,
      originalUnitPrice,
      discountAmount: pricing.discountAmount,
      unitPrice,
      total: unitPrice * entry.quantity,
    };
  });

  const merchandiseAmount = lines.reduce((sum, line) => sum + line.total, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.originalUnitPrice * line.entry.quantity, 0);
  const productDiscount = lines.reduce((sum, line) => sum + line.discountAmount * line.entry.quantity, 0);
  const tax = lines.reduce((sum, line) => sum + line.parts.tax * line.entry.quantity, 0);
  const preparationDays = Math.max(...lines.map((line) => line.product.preparationDays));

  let shippingFee = 0;
  let shippingMethodId: string | null = null;
  let shippingMethodTitle: string | null = null;

  if (input.delivery.method === "INSURED_SHIPPING" && input.delivery.shippingMethodId) {
    const { address, shippingMethodId: methodId } = input.delivery;
    const quote = await quoteForMethod(methodId, {
      lines: [],
      weightGrams: chargeableCartWeight(lines.map((line) => ({
        shippingWeightGrams: line.product.shippingWeightGrams,
        packageLengthCm: line.product.packageLengthCm === null ? null : Number(line.product.packageLengthCm),
        packageWidthCm: line.product.packageWidthCm === null ? null : Number(line.product.packageWidthCm),
        packageHeightCm: line.product.packageHeightCm === null ? null : Number(line.product.packageHeightCm),
        quantity: line.entry.quantity,
      })), 0),
      declaredValue: merchandiseAmount,
      destination: { provinceId: address.provinceId, cityId: address.cityId },
    });
    if (!quote) throw new ManualOrderError("روش ارسال انتخاب‌شده برای این مقصد در دسترس نیست.");
    shippingFee = quote.price;
    shippingMethodId = quote.methodId;
    shippingMethodTitle = quote.title;
  }

  const total = merchandiseAmount + shippingFee;
  if (total <= 0) throw new ManualOrderError("مبلغ نهایی سفارش معتبر نیست.");

  return { lines, rate, subtotal, productDiscount, tax, merchandiseAmount, shippingFee, shippingMethodId, shippingMethodTitle, total, preparationDays, orderSettings };
}

export const manualOrderQuoteSchema = manualOrderSchema.pick({ items: true, delivery: true });

export async function createManualOrder(actorId: string, input: ManualOrderInput) {
  const priced = await priceManualOrder(input);
  const { lines, rate, subtotal, productDiscount, tax, merchandiseAmount, shippingFee, shippingMethodId, shippingMethodTitle, total, preparationDays, orderSettings } = priced;
  if (merchandiseAmount < orderSettings.minimumOrderAmount) throw new ManualOrderError(`حداقل مبلغ سفارش ${orderSettings.minimumOrderAmount.toLocaleString("fa-IR")} ریال است.`);

  const customer = await resolveCustomer(input.customer);
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "مشتری حضوری";

  const shippingAddress: Prisma.InputJsonObject = input.delivery.method === "STORE_PICKUP"
    ? { recipient: customerName, phone: customer.phone ?? "" }
    : {
      recipient: input.delivery.address.recipient, phone: input.delivery.address.phone,
      province: input.delivery.address.province, city: input.delivery.address.city,
      postalCode: input.delivery.address.postalCode, addressLine: input.delivery.address.addressLine,
    };

  const deliveryMethod = input.delivery.method;
  const isPaid = input.payment === "PAID";

  try {
    return await db.$transaction(async (tx) => {
      await reserveInventory(tx, lines.map((line) => ({ productId: line.product.id, quantity: line.entry.quantity, selectionKey: line.entry.selectionKey })));
      const createdAt = new Date();
      const order = await tx.order.create({
        data: {
          orderNumber: `${orderSettings.orderNumberPrefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`,
          userId: customer.id,
          createdAt,
          status: isPaid ? "PAID" : "PENDING_PAYMENT",
          expiresAt: isPaid ? null : orderExpiresAt(orderSettings, createdAt),
          deliveryMethod,
          preparationDaysSnapshot: preparationDays,
          estimatedReadyAt: estimatedReadyAt(preparationDays, createdAt),
          inventoryReserved: true,
          goldPriceSnapshot: rate,
          subtotal,
          productDiscount,
          discount: productDiscount,
          shipping: shippingFee,
          shippingMethodId,
          shippingMethodTitle,
          tax,
          total,
          notes: input.notes || null,
          shippingAddress,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id, sku: line.product.sku, name: line.product.name,
              selectionKey: line.entry.selectionKey,
              selectedOptions: line.selectedOptions,
              quantity: line.entry.quantity,
              storeIndustry: line.product.storeIndustry,
              weightGrams: line.resolved.weightGrams, purity: line.product.purity,
              rawGold: line.parts.rawGold, makingFee: line.parts.makingFee, profit: line.parts.profit, tax: line.parts.tax,
              originalUnitPrice: line.originalUnitPrice, discountAmount: line.discountAmount,
              unitPrice: line.unitPrice, total: line.total,
            })),
          },
          payments: isPaid ? { create: { provider: "MANUAL", amount: total, status: "SUCCESS", paidAt: createdAt } } : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId, action: "ORDER_MANUAL_CREATE", entityType: "Order", entityId: order.id,
          metadata: { orderNumber: order.orderNumber, total, payment: input.payment, customer: customer.isGuest ? "walk-in" : "existing" },
        },
      });
      return order;
    });
  } catch (error) {
    if (error instanceof InventoryUnavailableError) throw new ManualOrderError(error.message || "موجودی یکی از اقلام کافی نیست.");
    throw error;
  }
}
