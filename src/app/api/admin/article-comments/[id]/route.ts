import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { adminArticleCommentModerationSchema } from "@/modules/article-comments/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = adminArticleCommentModerationSchema.parse(await request.json());
    const comment = await db.articleComment.findUnique({ where: { id }, select: { id: true, status: true, articleId: true, parentId: true } });
    if (!comment) return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.articleComment.update({ where: { id }, data: { status: input.status, moderationNote: input.note ?? null, moderatedAt: new Date(), moderatedById: actor.id } });
      if (input.status === "REJECTED" && !comment.parentId) await tx.articleComment.updateMany({ where: { parentId: id, status: "APPROVED" }, data: { status: "REJECTED", moderatedAt: new Date(), moderatedById: actor.id, moderationNote: "دیدگاه اصلی رد شده است." } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: input.status === "APPROVED" ? "ARTICLE_COMMENT_APPROVE" : "ARTICLE_COMMENT_REJECT", entityType: "ArticleComment", entityId: id, ...auditRequestContext(request, { articleId: comment.articleId, previousStatus: comment.status, nextStatus: input.status, note: input.note }) } });
    });
    return NextResponse.json({ message: input.status === "APPROVED" ? "دیدگاه تأیید شد." : "دیدگاه رد شد." });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const comment = await db.articleComment.findUnique({ where: { id }, select: { id: true, articleId: true, body: true } });
    if (!comment) return NextResponse.json({ message: "دیدگاه پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.articleComment.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_COMMENT_DELETE", entityType: "ArticleComment", entityId: id, ...auditRequestContext(request, { articleId: comment.articleId }) } });
    });
    return NextResponse.json({ message: "دیدگاه حذف شد." });
  } catch (error) { return apiError(error); }
}
