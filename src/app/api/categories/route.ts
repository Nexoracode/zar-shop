import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { buildCategoryTree } from "@/modules/categories/category-tree";
import { categorySchema } from "@/modules/categories/schemas";

const categoryInclude = {
  image: true,
  _count: { select: { products: true, children: true } },
} as const;

function isManager(role: string | undefined) {
  return role === "ADMIN" || role === "OPERATOR";
}

async function validateRelations(parentId?: string | null, imageId?: string | null) {
  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) return "دسته والد پیدا نشد.";
  }
  if (imageId) {
    const image = await db.mediaAsset.findUnique({ where: { id: imageId }, select: { type: true } });
    if (!image || image.type !== "IMAGE") return "تصویر شاخص معتبر نیست.";
  }
  return null;
}

export async function GET(request: Request) {
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  if (includeInactive) {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  }

  const categories = await db.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: categoryInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items: categories, tree: buildCategoryTree(categories) });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });

    const input = categorySchema.parse(await request.json());
    const relationError = await validateRelations(input.parentId, input.imageId);
    if (relationError) return NextResponse.json({ message: relationError }, { status: 422 });

    const category = await db.$transaction(async (tx) => {
      const created = await tx.category.create({ data: input, include: categoryInclude });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "CATEGORY_CREATE", entityType: "Category", entityId: created.id } });
      return created;
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی دسته‌بندی قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}
