import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createGuestSessionUser, getCurrentUser } from "@/modules/auth/session";
import { consumeGuestSessionAttempt, rateLimitResponse } from "@/modules/auth/rate-limit";
import { isVariantSnapshotValid, resolveVariantSelection } from "@/modules/products/variants";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { getCartProductCount, getCartSummary } from "@/modules/cart/cart-summary";

// The upper bound here only needs to reject pathological input cheaply; the real ceiling
// is the store's configurable orderSettings.maxOrderItemQuantity (1-100), checked below
// once it is loaded.
const inputSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  selectedOptions: z.record(z.string(), z.string().trim().min(1).max(80)).refine((value) => Object.keys(value).length <= 10).default({}),
});

const updateSchema = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(100),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const settings = await getGeneralStoreSettings();
      return NextResponse.json({ itemCount: 0, items: [], subtotal: 0, total: 0, discount: 0, currency: settings.currency });
    }
    return NextResponse.json(await getCartSummary(user.id));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const [currentUser, settings, orderSettings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings(), getOrderSettings()]);
    if (!isStorefrontAvailable(settings, currentUser?.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان ثبت خرید ندارد." }, { status: 503 });
    if (!currentUser && !settings.guestCheckout) return NextResponse.json({ message: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    const input = inputSchema.parse(await request.json());
    const product = await db.product.findFirst({ where: { id: input.productId, status: "ACTIVE", storeIndustry: settings.industry }, include: { variants: true } });
    if (!product || product.stock < input.quantity) return NextResponse.json({ message: "محصول موجود نیست یا موجودی کافی ندارد." }, { status: 409 });
    const selection = resolveVariantSelection(product.variants, input.selectedOptions, input.quantity);
    if (!selection.ok) {
      return selection.reason === "stock"
        ? NextResponse.json({ message: "موجودی تنوع انتخاب‌شده کافی نیست." }, { status: 409 })
        : NextResponse.json({ message: "ترکیب انتخاب‌شده برای این محصول موجود نیست." }, { status: 422 });
    }
    if (!currentUser) {
      const blockedUntil = await consumeGuestSessionAttempt(request);
      if (blockedUntil) return rateLimitResponse(blockedUntil);
    }
    const user = currentUser ?? await createGuestSessionUser();
    const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    const existing = await db.cartItem.findUnique({ where: { cartId_productId_selectionKey: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey } } });
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    const limitMessage = quantityLimitMessage(nextQuantity, product, orderSettings.maxOrderItemQuantity);
    if (limitMessage) return NextResponse.json({ message: limitMessage }, { status: 422 });
    if (!isVariantSnapshotValid(product.variants, selection.selectionKey, nextQuantity)) return NextResponse.json({ message: "موجودی تنوع انتخاب‌شده برای این تعداد کافی نیست." }, { status: 409 });
    await db.cartItem.upsert({
      where: { cartId_productId_selectionKey: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey } },
      create: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey, selectedOptions: selection.snapshot ?? undefined, quantity: input.quantity },
      update: { quantity: nextQuantity },
    });
    return NextResponse.json({ message: "به سبد خرید اضافه شد.", itemCount: await getCartProductCount(user.id, settings.industry), quantity: nextQuantity });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const [user, settings, orderSettings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings(), getOrderSettings()]);
    if (!user) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
    if (!isStorefrontAvailable(settings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان تغییر سبد را ندارد." }, { status: 503 });
    const input = updateSchema.parse(await request.json());
    const item = await db.cartItem.findFirst({ where: { id: input.cartItemId, cart: { userId: user.id } }, include: { product: { include: { variants: true } } } });
    if (!item) return NextResponse.json({ message: "این قلم در سبد خرید پیدا نشد." }, { status: 404 });
    const limitMessage = quantityLimitMessage(input.quantity, item.product, orderSettings.maxOrderItemQuantity);
    if (limitMessage) return NextResponse.json({ message: limitMessage }, { status: 422 });
    if (item.product.stock < input.quantity || !isVariantSnapshotValid(item.product.variants, item.selectionKey, input.quantity)) return NextResponse.json({ message: "موجودی کالا برای این تعداد کافی نیست." }, { status: 409 });
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
    return NextResponse.json({ message: "تعداد کالا به‌روزرسانی شد.", itemCount: await getCartProductCount(user.id, settings.industry) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const [user, settings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings()]);
  if (!user) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  if (!isStorefrontAvailable(settings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان تغییر سبد را ندارد." }, { status: 503 });
  const url = new URL(request.url);
  const cartItemId = url.searchParams.get("itemId");
  const productId = url.searchParams.get("productId");
  if (!cartItemId && !productId) return NextResponse.json({ message: "شناسه قلم سبد لازم است." }, { status: 400 });
  const cart = await db.cart.findUnique({ where: { userId: user.id } });
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id, ...(cartItemId ? { id: cartItemId } : { productId: productId! }) } });
  return NextResponse.json({ ok: true, itemCount: await getCartProductCount(user.id, settings.industry) });
}

/**
 * Why a quantity is not allowed, or null when it is.
 *
 * A product may narrow the store-wide cap but never widen it, so the effective ceiling is
 * whichever of the two is lower.
 */
function quantityLimitMessage(quantity: number, product: { minOrderQuantity: number; maxOrderQuantity: number | null }, storeMaximum: number) {
  if (quantity < product.minOrderQuantity) {
    return `حداقل تعداد سفارش این کالا ${product.minOrderQuantity.toLocaleString("fa-IR")} عدد است.`;
  }
  const ceiling = Math.min(product.maxOrderQuantity ?? storeMaximum, storeMaximum);
  if (quantity > ceiling) {
    return `حداکثر تعداد مجاز برای این کالا ${ceiling.toLocaleString("fa-IR")} عدد است.`;
  }
  return null;
}
