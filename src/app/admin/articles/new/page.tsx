import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintArticleForm } from "@/components/admin/blueprint/article-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "مقالهٔ جدید" };

export default async function NewArticlePage() {
  await requirePermission("settings:manage");
  const [categories, authors] = await Promise.all([
    db.articleCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <>
    <AdminPageHeader eyebrow="محتوا و وبلاگ" title="مقالهٔ جدید" description="عنوان، متن، تصویر کاور و تنظیمات انتشار و SEO مقاله را تعریف کنید." backHref="/admin/articles" backLabel="بازگشت به مقالات" />
    <BlueprintArticleForm categories={categories} authors={authors} />
  </>;
}
