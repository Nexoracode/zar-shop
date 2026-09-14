import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { updateArticleSchema } from "@/modules/articles/schemas";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { revalidateSitemap } from "@/modules/seo/revalidate";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "مقاله پیدا نشد." }, { status: 404 });

    const input = updateArticleSchema.parse(await request.json());

    if (input.coverMediaId) {
      const cover = await db.mediaAsset.findUnique({ where: { id: input.coverMediaId }, select: { type: true, scope: true } });
      if (!cover || cover.type !== "IMAGE" || cover.scope !== "ARTICLE") return NextResponse.json({ message: "تصویر کاور باید از گالری «مقالات» انتخاب شود." }, { status: 422 });
    }
    if (input.categoryId && !(await db.articleCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      return NextResponse.json({ message: "دستهٔ انتخاب‌شده پیدا نشد." }, { status: 422 });
    }
    if (input.authorId && !(await db.author.findUnique({ where: { id: input.authorId }, select: { id: true } }))) {
      return NextResponse.json({ message: "نویسندهٔ انتخاب‌شده پیدا نشد." }, { status: 422 });
    }
    if (input.relatedProductId && !(await db.product.findUnique({ where: { id: input.relatedProductId }, select: { id: true } }))) {
      return NextResponse.json({ message: "محصول مرتبط انتخاب‌شده پیدا نشد." }, { status: 422 });
    }

    const data: Record<string, unknown> = {};
    for (const key of ["title", "slug", "excerpt", "authorId", "status", "categoryId", "metaTitle", "metaDescription", "noindex", "coverMediaId", "relatedProductId"] as const) {
      if (input[key] !== undefined) data[key] = key === "metaTitle" || key === "metaDescription" || key === "coverMediaId" || key === "relatedProductId" ? input[key] ?? null : input[key];
    }
    if (input.tags !== undefined) data.tags = input.tags.length ? input.tags : null;
    if (input.content !== undefined) data.content = sanitizeProductDescription(input.content);
    // Stamp `publishedAt` the first time an article goes live; an explicit date always wins.
    const nextStatus = input.status ?? existing.status;
    if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    else if (nextStatus === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();

    const article = await db.$transaction(async (tx) => {
      const updated = await tx.article.update({ where: { id }, data });
      // Simplest correct approach for a small, admin-authored repeatable list: replace in full
      // on every save rather than diffing per-row ids.
      if (input.faqs !== undefined) {
        await tx.articleFaq.deleteMany({ where: { articleId: id } });
        if (input.faqs.length) await tx.articleFaq.createMany({ data: input.faqs.map((faq, index) => ({ articleId: id, question: faq.question, answer: faq.answer, sortOrder: index })) });
      }
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_UPDATE", entityType: "Article", entityId: id, ...auditRequestContext(request, { changedFields: Object.keys(data) }) } });
      return updated;
    });

    revalidateSitemap();
    return NextResponse.json(article);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی مقاله قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const article = await db.article.findUnique({ where: { id }, select: { title: true, slug: true } });
    if (!article) return NextResponse.json({ message: "مقاله پیدا نشد." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.article.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_DELETE", entityType: "Article", entityId: id, ...auditRequestContext(request, { title: article.title, slug: article.slug }) } });
    });
    revalidateSitemap();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
