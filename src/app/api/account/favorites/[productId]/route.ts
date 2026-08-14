import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";

type Context = { params: Promise<{ productId: string }> };

export async function PUT(_: Request, context: Context) {
  try {
    const [user, { productId }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ذخیره علاقه‌مندی‌ها وارد حساب شوید." }, { status: 401 });
    const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    await db.productFavorite.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: {} });
    return NextResponse.json({ favorite: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const [user, { productId }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    await db.productFavorite.deleteMany({ where: { userId: user.id, productId } });
    return NextResponse.json({ favorite: false });
  } catch (error) { return apiError(error); }
}
