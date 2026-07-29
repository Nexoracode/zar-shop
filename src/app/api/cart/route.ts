import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { createGuestSessionUser, getCurrentUser } from "@/modules/auth/session";
import { resolveOptionSelection } from "@/modules/products/options";
import { getGeneralStoreSettings, isStorefrontAvailable } from "@/modules/settings/general-settings";

const inputSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  selectedOptions: z.record(z.string(), z.string().trim().min(1).max(80)).refine((value) => Object.keys(value).length <= 10).default({}),
});

export async function POST(request: Request) {
  try {
    const [currentUser, settings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings()]);
    if (!isStorefrontAvailable(settings, currentUser?.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان ثبت خرید ندارد." }, { status: 503 });
    if (!currentUser && !settings.guestCheckout) return NextResponse.json({ message: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    const input = inputSchema.parse(await request.json());
    const product = await db.product.findFirst({ where: { id: input.productId, status: "ACTIVE" }, include: { options: { orderBy: { position: "asc" } } } });
    if (!product || product.stock < input.quantity) return NextResponse.json({ message: "محصول موجود نیست یا موجودی کافی ندارد." }, { status: 409 });
    const selection = resolveOptionSelection(product.options, input.selectedOptions, input.quantity, product.stock);
    if (!selection.ok) return NextResponse.json({ message: `لطفاً یک مقدار معتبر برای «${selection.optionName}» انتخاب کنید.` }, { status: 422 });
    const user = currentUser ?? await createGuestSessionUser();
    const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await db.cartItem.upsert({
      where: { cartId_productId_selectionKey: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey } },
      create: { cartId: cart.id, productId: product.id, selectionKey: selection.selectionKey, selectedOptions: selection.snapshot ?? undefined, quantity: input.quantity },
      update: { quantity: input.quantity },
    });
    return NextResponse.json({ message: "به سبد خرید اضافه شد." });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const [user, settings] = await Promise.all([getCurrentUser(), getGeneralStoreSettings()]);
  if (!user) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  if (!isStorefrontAvailable(settings, user.role)) return NextResponse.json({ message: "فروشگاه در حال حاضر امکان تغییر سبد را ندارد." }, { status: 503 });
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ message: "شناسه محصول لازم است." }, { status: 400 });
  const cart = await db.cart.findUnique({ where: { userId: user.id } });
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return NextResponse.json({ ok: true });
}
