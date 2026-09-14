import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircleReply } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { formatDateTime } from "@/lib/format";
import { articleCommentStatusLabels, articleCommentStatusTones } from "@/modules/admin/labels";
import { articlePath } from "@/modules/articles/paths";
import { BpTag } from "./ui";
import { BlueprintArticleCommentManager } from "./article-comment-manager";

type CommentDetail = {
  id: string;
  parentId: string | null;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  moderationNote: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  article: { title: string; slug: string };
  user: { firstName: string | null; lastName: string | null; phone: string | null };
  moderatedBy: { firstName: string | null; lastName: string | null } | null;
  parent: { id: string; body: string } | null;
  replies: Array<{ id: string; body: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: Date; user: { firstName: string | null; lastName: string | null; role: string } }>;
};

function SectionHeader({ icon, title, description, count }: { icon: ReactNode; title: string; description?: string; count?: number }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--bp-divider)] p-[18px]">
      <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-[13px] font-bold">{title}</h2>
        {description && <p className="bp-muted m-0 mt-1 text-[12px] leading-5">{description}</p>}
      </div>
      {typeof count === "number" && <BpTag>{count.toLocaleString("fa-IR")}</BpTag>}
    </div>
  );
}

export function BlueprintArticleCommentDetailView({ comment }: { comment: CommentDetail }) {
  const author = `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim() || comment.user.phone || "کاربر";
  const moderator = comment.moderatedBy ? `${comment.moderatedBy.firstName ?? ""} ${comment.moderatedBy.lastName ?? ""}`.trim() : null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="grid min-w-0 gap-4">
        <section className="bp-frame relative overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--bp-divider)] p-[18px] sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-divider)] text-[15px] font-bold">{author.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <strong className="text-[14px]">{author}</strong>
              <span className="bp-muted mt-1 block text-[12px]">{formatDateTime(comment.createdAt)}</span>
            </div>
          </div>

          <div className="p-[18px]">
            {comment.parent && (
              <div className="mb-4 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <span className="bp-muted text-[11px] font-bold">در پاسخ به</span>
                <Link href={`/admin/article-comments/${comment.parent.id}`} className="mt-1 block text-[13px] font-bold text-[var(--bp-accent)]">{comment.parent.body.slice(0, 100)}</Link>
              </div>
            )}
            <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8">{comment.body}</p>
          </div>

          <div className="grid gap-px border-t border-[var(--bp-divider)] bg-[var(--bp-divider)] sm:grid-cols-3">
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">مقاله</span><Link href={articlePath(comment.article.slug)} className="mt-1 block truncate text-[12px] font-bold text-[var(--bp-accent)]">{comment.article.title}</Link></div>
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">شماره کاربر</span><span dir="ltr" className="mt-1 block truncate text-[12px] font-bold">{comment.user.phone || "—"}</span></div>
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">آخرین ویرایش</span><span className="mt-1 block text-[12px] font-bold">{formatDateTime(comment.updatedAt)}</span></div>
          </div>

          {(comment.moderationNote || moderator) && (
            <div className="border-t border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-[18px]">
              <strong className="block text-[12px] text-[var(--bp-warning)]">یادداشت بررسی مدیریت</strong>
              {comment.moderationNote && <p className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-warning)]">{comment.moderationNote}</p>}
              {moderator && <span className="mt-1 block text-[10px] text-[var(--bp-warning)]">بررسی‌شده توسط {moderator}{comment.moderatedAt ? ` در ${formatDateTime(comment.moderatedAt)}` : ""}</span>}
            </div>
          )}
        </section>

        <section className="bp-frame relative overflow-hidden">
          <SectionHeader icon={<MessageCircleReply size={16} />} title="پاسخ‌های دیدگاه" description="گفت‌وگوی شکل‌گرفته زیر این دیدگاه" count={comment.replies.length} />
          {comment.replies.length ? (
            <div className="divide-y divide-[var(--bp-divider)]">
              {comment.replies.map((reply) => {
                const name = `${reply.user.firstName ?? ""} ${reply.user.lastName ?? ""}`.trim() || "کاربر";
                const isManagement = reply.user.role !== "CUSTOMER";
                return (
                  <article key={reply.id} className="p-[18px]">
                    <div className="flex items-start gap-3">
                      <span className={`grid size-9 shrink-0 place-items-center border text-[12px] font-bold ${isManagement ? "border-[var(--bp-accent)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)]"}`}>{name.slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[12px]">{name}</strong>
                          {isManagement && <BpTag tone="accent">مدیریت فروشگاه</BpTag>}
                          <AdminStatusBadge tone={articleCommentStatusTones[reply.status]}>{articleCommentStatusLabels[reply.status]}</AdminStatusBadge>
                          <span className="bp-muted ms-auto text-[10px]">{formatDateTime(reply.createdAt)}</span>
                        </div>
                        <p className="m-0 mt-2 whitespace-pre-wrap break-words text-[13px] leading-7">{reply.body}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-[18px] py-10 text-center">
              <MessageCircleReply size={22} className="bp-muted mx-auto" />
              <p className="bp-muted m-0 mt-2 text-[12px]">هنوز پاسخی برای این دیدگاه ثبت نشده است.</p>
            </div>
          )}
        </section>
      </main>

      <aside>
        <BlueprintArticleCommentManager commentId={comment.id} status={comment.status} excerpt={comment.body.slice(0, 80)} initialNote={comment.moderationNote ?? ""} canReply={!comment.parentId && comment.status === "APPROVED"} />
      </aside>
    </div>
  );
}
