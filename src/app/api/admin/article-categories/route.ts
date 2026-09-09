import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getPermittedActor } from "@/modules/auth/session";
import { articleCategorySchema } from "@/modules/articles/schemas";
import { auditRequestContext } from "@/modules/audit/request-context";
import { revalidateSitemap } from "@/modules/seo/revalidate";

const categoryInclude = { _count: { select: { articles: true } } } as const;

export async function GET(request: Request) {
  const actor = await getPermittedActor("settings:manage");
  if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const items = await db.articleCategory.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: categoryInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const actor = await getPermittedActor("settings:manage");
    if (!actor) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const input = articleCategorySchema.parse(await request.json());
    const category = await db.$transaction(async (tx) => {
      const created = await tx.articleCategory.create({ data: input, include: categoryInclude });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "ARTICLE_CATEGORY_CREATE", entityType: "ArticleCategory", entityId: created.id, ...auditRequestContext(request, { name: created.name, slug: created.slug }) } });
      return created;
    });
    revalidateSitemap();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی دسته قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
