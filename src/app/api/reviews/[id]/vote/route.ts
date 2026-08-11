import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { productReviewVoteSchema } from "@/modules/reviews/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای رأی دادن وارد حساب کاربری شوید." }, { status: 401 });
    const { value } = productReviewVoteSchema.parse(await request.json());
    const review = await db.productReview.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
    if (!review || review.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    if (review.userId === user.id) return NextResponse.json({ message: "امکان رأی دادن به دیدگاه خودتان وجود ندارد." }, { status: 409 });
    if (value === 0) await db.productReviewVote.deleteMany({ where: { reviewId: id, userId: user.id } });
    else await db.productReviewVote.upsert({ where: { reviewId_userId: { reviewId: id, userId: user.id } }, create: { reviewId: id, userId: user.id, value }, update: { value } });
    const votes = await db.productReviewVote.groupBy({ by: ["value"], where: { reviewId: id }, _count: { value: true } });
    return NextResponse.json({ likes: votes.find((item) => item.value === 1)?._count.value ?? 0, dislikes: votes.find((item) => item.value === -1)?._count.value ?? 0, current: value });
  } catch (error) { return apiError(error); }
}
