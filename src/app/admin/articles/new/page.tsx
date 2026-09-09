import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintArticleForm } from "@/components/admin/blueprint/article-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const metadata: Metadata = { title: "مقالهٔ جدید" };

export default async function NewArticlePage() {
  await requirePermission("settings:manage");
  const [categories, settings] = await Promise.all([
    db.articleCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getGeneralStoreSettings(),
  ]);
  return <>
    <AdminPageHeader eyebrow="محتوا و وبلاگ" title="مقالهٔ جدید" description="عنوان، متن، تصویر کاور و تنظیمات انتشار و SEO مقاله را تعریف کنید." backHref="/admin/articles" backLabel="بازگشت به مقالات" />
    <BlueprintArticleForm categories={categories} defaultAuthorName={settings.storeName} />
  </>;
}
