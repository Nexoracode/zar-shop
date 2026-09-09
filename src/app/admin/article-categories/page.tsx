import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintArticleCategoriesView } from "@/components/admin/blueprint/article-categories-view";

export const metadata: Metadata = { title: "دسته‌بندی مقالات" };

export default async function AdminArticleCategoriesPage() {
  await requirePermission("settings:manage");
  const categories = await db.articleCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isActive: true, sortOrder: true, _count: { select: { articles: true } } },
  });
  return <BlueprintArticleCategoriesView categories={categories} />;
}
