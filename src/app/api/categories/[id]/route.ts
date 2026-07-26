import { NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { getCurrentUser } from "@/modules/auth/session";
import { updateCategorySchema } from "@/modules/categories/schemas";
import { wouldCreateCategoryCycle } from "@/modules/categories/category-tree";

type Context = { params: Promise<{ id: string }> };

const categoryInclude = {
  image: true,
  parent: { select: { id: true, name: true, slug: true } },
  children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { image: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

function isManager(role: string | undefined) {
  return role === "ADMIN" || role === "OPERATOR";
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  if (includeInactive) {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
  }
  const category = await db.category.findFirst({
    where: { id, ...(includeInactive ? {} : { isActive: true }) },
    include: categoryInclude,
  });
  if (!category) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });
  return NextResponse.json(category);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const input = updateCategorySchema.parse(await request.json());

    const current = await db.category.findUnique({ where: { id }, select: { id: true, parentId: true } });
    if (!current) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });

    if (input.parentId) {
      const categories = await db.category.findMany({ select: { id: true, parentId: true } });
      if (!categories.some((category) => category.id === input.parentId)) {
        return NextResponse.json({ message: "دسته والد پیدا نشد." }, { status: 422 });
      }
      if (wouldCreateCategoryCycle(id, input.parentId, categories)) {
        return NextResponse.json({ message: "یک دسته نمی‌تواند زیرمجموعه خودش یا فرزندانش باشد." }, { status: 422 });
      }
    }

    if (input.imageId) {
      const image = await db.mediaAsset.findUnique({ where: { id: input.imageId }, select: { type: true, scope: true } });
      if (!image || image.type !== "IMAGE" || image.scope !== "CATEGORY") return NextResponse.json({ message: "تصویر شاخص معتبر نیست." }, { status: 422 });
    }

    const category = await db.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: input, include: categoryInclude });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "CATEGORY_UPDATE", entityType: "Category", entityId: id, metadata: { previousParentId: current.parentId } } });
      return updated;
    });
    return NextResponse.json(category);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "این نشانی دسته‌بندی قبلاً استفاده شده است." }, { status: 409 });
    }
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await getCurrentUser();
    if (!isManager(actor?.role)) return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 403 });
    const { id } = await context.params;
    const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!category) return NextResponse.json({ message: "دسته‌بندی پیدا نشد." }, { status: 404 });
    if (category._count.children > 0 || category._count.products > 0) {
      return NextResponse.json({ message: "دسته دارای محصول یا زیردسته است و قابل حذف نیست." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId: actor!.id, action: "CATEGORY_DELETE", entityType: "Category", entityId: id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
