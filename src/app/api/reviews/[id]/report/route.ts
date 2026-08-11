import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productReviewReportSchema } from "@/modules/reviews/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای گزارش دیدگاه وارد حساب کاربری شوید." }, { status: 401 });
    const input = productReviewReportSchema.parse(await request.json());
    const review = await db.productReview.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
    if (!review || review.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    if (review.userId === user.id) return NextResponse.json({ message: "امکان گزارش دیدگاه خودتان وجود ندارد." }, { status: 409 });
    const existing = await db.productReviewReport.findUnique({ where: { reviewId_userId: { reviewId: id, userId: user.id } }, select: { id: true } });
    if (existing) return NextResponse.json({ message: "این دیدگاه قبلاً توسط شما گزارش شده است." }, { status: 409 });
    await db.productReviewReport.create({ data: { reviewId: id, userId: user.id, reason: input.reason, details: input.details } });
    return NextResponse.json({ message: "گزارش شما ثبت شد و توسط مدیریت بررسی می‌شود." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
