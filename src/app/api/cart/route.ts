import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createGuestSessionUser, getCurrentUser } from "@/modules/auth/session";
import { isOptionSnapshotValid, resolveOptionSelection } from "@/modules/products/options";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { getCartSummary } from "@/modules/cart/cart-summary";

const inputSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  selectedOptions: z.record(z.string(), z.string().trim().min(1).max(80)).refine((value) => Object.keys(value).length <= 10).default({}),
});

const updateSchema = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1),
});

async function cartItemCount(userId: string) {
  const result = await db.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

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
    const product = await db.product.findFirst({ where: { id: input.productId, status: "ACTIVE", storeIndustry: settings.industry }, include: { options: { orderBy: { position: "asc" } } } });
    if (!product || product.stock < input.quantity) return NextResponse.json({ message: "محصول موجود نیست یا موجودی کافی ندارد." }, { status: 409 });
    const selection = resolveOptionSelection(product.options, input.selectedOptions, input.quantity, product.stock);
    if (!selection.ok) return NextResponse.json({ message: `لطفاً یک مقدار معتبر برای «${selection.optionName}» انتخاب کنید.` }, { status: 422 });
    const user = currentUser ?? await createGuestSessionUser();
    const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    const existing = await db.cartItem.findUnique({ where: { cartId_productId_selectionKey: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey } } });
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    if (nextQuantity > orderSettings.maxOrderItemQuantity) return NextResponse.json({ message: `حداکثر تعداد مجاز برای هر کالا ${orderSettings.maxOrderItemQuantity.toLocaleString("fa-IR")} عدد است.` }, { status: 422 });
    const finalSelection = resolveOptionSelection(product.options, input.selectedOptions, nextQuantity, product.stock);
    if (!finalSelection.ok) return NextResponse.json({ message: "موجودی تنوع انتخاب‌شده برای این تعداد کافی نیست." }, { status: 409 });
    await db.cartItem.upsert({
      where: { cartId_productId_selectionKey: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey } },
      create: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey, selectedOptions: selection.snapshot ?? undefined, quantity: input.quantity },
      update: { quantity: nextQuantity },
    });
    return NextResponse.json({ message: "به سبد خرید اضافه شد.", itemCount: await cartItemCount(user.id), quantity: nextQuantity });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const [user, settings, orderSettings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings(), getOrderSettings()]);
    if (!user) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
    if (!isStorefrontAvailable(settings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان تغییر سبد را ندارد." }, { status: 503 });
    const input = updateSchema.parse(await request.json());
    if (input.quantity > orderSettings.maxOrderItemQuantity) return NextResponse.json({ message: `حداکثر تعداد مجاز ${orderSettings.maxOrderItemQuantity.toLocaleString("fa-IR")} عدد است.` }, { status: 422 });
    const item = await db.cartItem.findFirst({ where: { id: input.cartItemId, cart: { userId: user.id } }, include: { product: { include: { options: true } } } });
    if (!item) return NextResponse.json({ message: "این قلم در سبد خرید پیدا نشد." }, { status: 404 });
    if (item.product.stock < input.quantity || !isOptionSnapshotValid(item.product.options, item.selectedOptions, input.quantity, item.product.stock)) return NextResponse.json({ message: "موجودی کالا برای این تعداد کافی نیست." }, { status: 409 });
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
    return NextResponse.json({ message: "تعداد کالا به‌روزرسانی شد.", itemCount: await cartItemCount(user.id) });
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
  return NextResponse.json({ ok: true, itemCount: await cartItemCount(user.id) });
}
