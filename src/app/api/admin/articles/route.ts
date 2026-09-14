import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { db } from "@/lib/db";
import { getPermittedActor } from "@/modules/auth/session";
import { auditRequestContext } from "@/modules/audit/request-context";
import { articleSchema } from "@/modules/articles/schemas";
import { sanitizeProductDescription } from "@/modules/products/rich-text";
import { revalidateSitemap } from "@/modules/seo/revalidate";

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = articleSchema.parse(await request.json());

    if (input.coverMediaId) {
      const cover = await db.mediaAsset.findUnique({ where: { id: input.coverMediaId }, select: { type: true, scope: true } });
      if (!cover || cover.type !== "IMAGE" || cover.scope !== "ARTICLE") return NextResponse.json({ message: "تصویر کاور باید از گالری «مقالات» انتخاب شود." }, { status: 422 });
    }
    if (input.categoryId && !(await db.articleCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      return NextResponse.json({ message: "دستهٔ انتخاب‌شده پیدا نشد." }, { status: 422 });
    }
    if (!(await db.author.findUnique({ where: { id: input.authorId }, select: { id: true } }))) {
      return NextResponse.json({ message: "نویسندهٔ انتخاب‌شده پیدا نشد." }, { status: 422 });
    }
    if (input.relatedProductId && !(await db.product.findUnique({ where: { id: input.relatedProductId }, select: { id: true } }))) {
      return NextResponse.json({ message: "محصول مرتبط انتخاب‌شده پیدا نشد." }, { status: 422 });
    }

    const publishedAt = input.status === "PUBLISHED" ? new Date(input.publishedAt ?? Date.now()) : input.publishedAt ? new Date(input.publishedAt) : null;

    const article = await db.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt,
          content: sanitizeProductDescription(input.content),
          coverMediaId: input.coverMediaId ?? null,
          authorId: input.authorId,
          tags: input.tags && input.tags.length ? input.tags : undefined,
          relatedProductId: input.relatedProductId ?? null,
          status: input.status,
          publishedAt,
          categoryId: input.categoryId ?? null,
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          noindex: input.noindex,
          faqs: input.faqs?.length ? { create: input.faqs.map((faq, index) => ({ question: faq.question, answer: faq.answer, sortOrder: index })) } : undefined,
        },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_CREATE", entityType: "Article", entityId: created.id, ...auditRequestContext(request, { title: created.title, slug: created.slug, status: created.status }) } });
      return created;
    });

    revalidateSitemap();
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی مقاله قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
