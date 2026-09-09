import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintArticleForm } from "@/components/admin/blueprint/article-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

type Context = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Context) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const [article, categories, settings] = await Promise.all([
    db.article.findUnique({ where: { id }, include: { coverMedia: true } }),
    db.articleCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getGeneralStoreSettings(),
  ]);
  if (!article) notFound();

  return <>
    <AdminPageHeader eyebrow="محتوا و وبلاگ" title="ویرایش مقاله" description={article.title} backHref="/admin/articles" backLabel="بازگشت به مقالات" />
    <BlueprintArticleForm
      categories={categories}
      defaultAuthorName={settings.storeName}
      article={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        authorName: article.authorName,
        status: article.status,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        categoryId: article.categoryId,
        metaTitle: article.metaTitle ?? "",
        metaDescription: article.metaDescription ?? "",
        noindex: article.noindex,
        cover: article.coverMedia ? { id: article.coverMedia.id, title: article.coverMedia.title || article.coverMedia.alt || "کاور مقاله", url: article.coverMedia.url, type: "IMAGE", mimeType: article.coverMedia.mimeType } : null,
      }}
    />
  </>;
}
