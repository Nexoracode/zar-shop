import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { createProductReviewSchema } from "@/modules/reviews/schemas";
import { getStorefrontProductReviews, hasPurchasedProduct } from "@/modules/reviews/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const [{ id }, user] = await Promise.all([context.params, getCurrentUser()]);
    const product = await db.product.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true } });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });
    return NextResponse.json(await getStorefrontProductReviews(id, user?.id ?? null));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const [user, { id: productId }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    const input = createProductReviewSchema.parse(await request.json());
    const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!product) return NextResponse.json({ message: "محصول پیدا نشد." }, { status: 404 });

    if (input.parentId) {
      const parent = await db.productReview.findUnique({ where: { id: input.parentId }, select: { id: true, productId: true, parentId: true, status: true } });
      if (!parent || parent.productId !== productId || parent.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه موردنظر برای پاسخ پیدا نشد." }, { status: 404 });
      if (parent.parentId) return NextResponse.json({ message: "پاسخ فقط برای دیدگاه اصلی قابل ثبت است." }, { status: 422 });
    }

    const isVerifiedPurchase = await hasPurchasedProduct(user.id, productId);
    const review = await db.productReview.create({
      data: {
        productId,
        userId: user.id,
        parentId: input.parentId ?? null,
        rating: input.parentId ? null : input.rating,
        title: input.parentId ? null : input.title,
        body: input.body,
        isVerifiedPurchase,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: review.id, message: "دیدگاه شما ثبت شد و پس از بررسی مدیریت نمایش داده می‌شود." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
