import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminArticleCommentReplySchema } from "@/modules/article-comments/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = adminArticleCommentReplySchema.parse(await request.json());
    const parent = await db.articleComment.findUnique({ where: { id }, select: { id: true, articleId: true, parentId: true, status: true } });
    if (!parent || parent.parentId || parent.status !== "APPROVED") return NextResponse.json({ message: "دیدگاه اصلی تأییدشده پیدا نشد." }, { status: 404 });
    const reply = await db.$transaction(async (tx) => {
      const created = await tx.articleComment.create({ data: { articleId: parent.articleId, userId: actor.id, parentId: parent.id, body: input.body, status: "APPROVED", moderatedAt: new Date(), moderatedById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_COMMENT_REPLY", entityType: "ArticleComment", entityId: created.id, ...auditRequestContext(request, { articleId: parent.articleId, parentId: parent.id }) } });
      return created;
    });
    return NextResponse.json({ id: reply.id, message: "پاسخ مدیریت ثبت شد." }, { status: 201 });
  } catch (error) { return apiError(error); }
}
