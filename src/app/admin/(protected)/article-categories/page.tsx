import type { Metadata } from "next";
import { db } from "@/lib/db";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintArticleCategoriesView } from "@/components/admin/blueprint/article-categories-view";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "دسته‌بندی مقالات" };

export default async function AdminArticleCategoriesPage() {
  await requirePermission("settings:manage");
  const [categories, initialHiddenColumns] = await Promise.all([
    db.articleCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isActive: true, sortOrder: true, _count: { select: { articles: true } } },
    }),
    readHiddenColumns("articleCategories"),
  ]);
  return <BlueprintArticleCategoriesView categories={categories} initialHiddenColumns={initialHiddenColumns} />;
}
