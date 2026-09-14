import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { updateArticleCategorySchema } from "@/modules/articles/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";
import { revalidateSitemap } from "@/modules/seo/revalidate";

type Context = { params: Promise<{ id: string }> };

const categoryInclude = { _count: { select: { articles: true } } } as const;

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateArticleCategorySchema.parse(await request.json());
    if (!(await db.articleCategory.findUnique({ where: { id }, select: { id: true } }))) {
      return NextResponse.json({ message: "دسته پیدا نشد." }, { status: 404 });
    }
    const category = await db.$transaction(async (tx) => {
      const updated = await tx.articleCategory.update({ where: { id }, data: input, include: categoryInclude });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_CATEGORY_UPDATE", entityType: "ArticleCategory", entityId: id, ...auditRequestContext(request, { name: updated.name, slug: updated.slug }) } });
      return updated;
    });
    revalidateSitemap();
    return NextResponse.json(category);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی دسته قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const category = await db.articleCategory.findUnique({ where: { id }, select: { name: true, slug: true, _count: { select: { articles: true } } } });
    if (!category) return NextResponse.json({ message: "دسته پیدا نشد." }, { status: 404 });
    // An article can no longer exist without a category, so a category still in use can't be deleted.
    if (category._count.articles > 0) {
      return NextResponse.json({ message: "این دسته مقاله دارد و قابل حذف نیست." }, { status: 409 });
    }
    await db.$transaction(async (tx) => {
      await tx.articleCategory.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_CATEGORY_DELETE", entityType: "ArticleCategory", entityId: id, ...auditRequestContext(request, { name: category.name, slug: category.slug }) } });
    });
    revalidateSitemap();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
