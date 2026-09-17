import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintArticleForm } from "@/components/admin/blueprint/article-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Context = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Context) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const [article, categories, authors] = await Promise.all([
    db.article.findUnique({
      where: { id },
      include: {
        coverMedia: true,
        faqs: { orderBy: { sortOrder: "asc" } },
        relatedProduct: { select: { id: true, name: true, sku: true } },
      },
    }),
    db.articleCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!article) notFound();

  return <>
    <AdminPageHeader eyebrow="محتوا و وبلاگ" title="ویرایش مقاله" description={article.title} backHref="/admin/articles" backLabel="بازگشت به مقالات" />
    <BlueprintArticleForm
      categories={categories}
      authors={authors}
      article={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        authorId: article.authorId,
        tags: Array.isArray(article.tags) ? (article.tags as string[]) : [],
        relatedProduct: article.relatedProduct,
        faqs: article.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer })),
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
