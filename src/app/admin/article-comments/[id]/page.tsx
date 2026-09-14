import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { BlueprintArticleCommentDetailView } from "@/components/admin/blueprint/article-comment-detail-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { articleCommentStatusLabels, articleCommentStatusTones } from "@/modules/admin/labels";

function MetricCard({ icon, label, children, tone = "" }: { icon: ReactNode; label: string; children: ReactNode; tone?: string }) {
  return (
    <AdminPanel className="p-4">
      <span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]">{icon}{label}</span>
      <strong className={`text-base ${tone}`.trim()}>{children}</strong>
    </AdminPanel>
  );
}

export default async function AdminArticleCommentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const comment = await db.articleComment.findUnique({
    where: { id },
    include: {
      article: { select: { title: true, slug: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
      moderatedBy: { select: { firstName: true, lastName: true } },
      parent: { select: { id: true, body: true } },
      replies: { include: { user: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "asc" } },
      votes: { select: { value: true } },
    },
  });
  if (!comment) notFound();

  const author = `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim() || comment.user.phone || "کاربر";
  const likes = comment.votes.filter((vote) => vote.value === 1).length;
  const dislikes = comment.votes.filter((vote) => vote.value === -1).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="محتوا و وبلاگ"
        title={comment.parentId ? "پاسخ کاربر" : "دیدگاه مقاله"}
        description={`دیدگاه ${author} درباره مقالهٔ «${comment.article.title}»`}
        backHref="/admin/article-comments"
        backLabel="بازگشت به دیدگاه‌ها"
        action={<AdminStatusBadge tone={articleCommentStatusTones[comment.status]}>{articleCommentStatusLabels[comment.status]}</AdminStatusBadge>}
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <MetricCard icon={<ThumbsUp size={16} />} label="رأی مثبت" tone="text-[var(--success)]">{likes.toLocaleString("fa-IR")}</MetricCard>
        <MetricCard icon={<ThumbsDown size={16} />} label="رأی منفی" tone="text-[var(--danger)]">{dislikes.toLocaleString("fa-IR")}</MetricCard>
      </section>

      <BlueprintArticleCommentDetailView comment={comment} />
    </>
  );
}
