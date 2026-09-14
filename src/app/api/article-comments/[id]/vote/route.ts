import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { articleCommentVoteSchema } from "@/modules/article-comments/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const [user, { id }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای رأی دادن وارد حساب کاربری شوید." }, { status: 401 });
    const { value } = articleCommentVoteSchema.parse(await request.json());
    const comment = await db.articleComment.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
    if (!comment || comment.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    if (comment.userId === user.id) return NextResponse.json({ message: "امکان رأی دادن به دیدگاه خودتان وجود ندارد." }, { status: 409 });
    if (value === 0) await db.articleCommentVote.deleteMany({ where: { commentId: id, userId: user.id } });
    else await db.articleCommentVote.upsert({ where: { commentId_userId: { commentId: id, userId: user.id } }, create: { commentId: id, userId: user.id, value }, update: { value } });
    const votes = await db.articleCommentVote.groupBy({ by: ["value"], where: { commentId: id }, _count: { value: true } });
    return NextResponse.json({ likes: votes.find((item) => item.value === 1)?._count.value ?? 0, dislikes: votes.find((item) => item.value === -1)?._count.value ?? 0, current: value });
  } catch (error) { return apiError(error); }
}
