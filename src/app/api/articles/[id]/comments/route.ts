import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { createArticleCommentSchema } from "@/modules/article-comments/schemas";
import { getStorefrontArticleComments } from "@/modules/article-comments/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const [{ id }, user] = await Promise.all([context.params, getCurrentUser()]);
    const article = await db.article.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
    if (!article) return NextResponse.json({ message: "مقاله پیدا نشد." }, { status: 404 });
    return NextResponse.json(await getStorefrontArticleComments(id, user?.id ?? null));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const [user, { id: articleId }] = await Promise.all([getCurrentUser(), context.params]);
    if (!user || user.isGuest) return NextResponse.json({ message: "برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید." }, { status: 401 });
    const input = createArticleCommentSchema.parse(await request.json());
    const article = await db.article.findFirst({ where: { id: articleId, status: "PUBLISHED" }, select: { id: true } });
    if (!article) return NextResponse.json({ message: "مقاله پیدا نشد." }, { status: 404 });

    if (input.parentId) {
      const parent = await db.articleComment.findUnique({ where: { id: input.parentId }, select: { id: true, articleId: true, parentId: true, status: true } });
      if (!parent || parent.articleId !== articleId || parent.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه موردنظر برای پاسخ پیدا نشد." }, { status: 404 });
      if (parent.parentId) return NextResponse.json({ message: "پاسخ فقط برای دیدگاه اصلی قابل ثبت است." }, { status: 422 });
    }

    const comment = await db.articleComment.create({
      data: { articleId, userId: user.id, parentId: input.parentId ?? null, body: input.body },
      select: { id: true },
    });
    return NextResponse.json({ id: comment.id, message: "دیدگاه شما ثبت شد و پس از بررسی مدیریت نمایش داده می‌شود." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
