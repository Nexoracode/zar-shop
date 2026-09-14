import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { Eye, MessageSquareText, ThumbsUp, UserRound } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDate, formatDateTime } from "@/lib/format";
import { articleCommentStatusLabels, articleCommentStatusTones } from "@/modules/admin/labels";
import { BpLinkButton, BpTable, BpTd, BpTh } from "./ui";

type CommentRow = Prisma.ArticleCommentGetPayload<{
  include: {
    article: { select: { title: true; slug: true } };
    user: { select: { firstName: true; lastName: true; phone: true } };
    _count: { select: { replies: true; votes: true } };
  };
}>;

function authorName(comment: CommentRow) {
  return `${comment.user.firstName ?? ""} ${comment.user.lastName ?? ""}`.trim() || comment.user.phone || "کاربر";
}

export function BlueprintArticleCommentsView({ comments, pagination }: { comments: CommentRow[]; pagination: ReturnType<typeof resolveAdminPagination> }) {
  return (
    <>
      <div className="xl:hidden">
        {comments.map((comment) => {
          const name = authorName(comment);
          return (
            <article key={comment.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[13px] font-bold"><UserRound size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-[13px]">{name}</strong>
                    <span className="ms-auto"><AdminStatusBadge tone={articleCommentStatusTones[comment.status]}>{articleCommentStatusLabels[comment.status]}</AdminStatusBadge></span>
                  </div>
                  <span className="bp-muted mt-0.5 block truncate text-[11px]">{comment.article.title}</span>
                </div>
              </div>
              <div className="mt-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <p className="bp-muted m-0 line-clamp-2 break-words text-[12px] leading-6">{comment.body}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="bp-muted inline-flex items-center gap-1 text-[11px]"><ThumbsUp size={13} />{comment._count.votes.toLocaleString("fa-IR")}</span>
                <span className="bp-muted text-[11px]">{formatDate(comment.createdAt)}</span>
                <BpLinkButton href={`/admin/article-comments/${comment.id}`} size="sm" className="ms-auto gap-1.5"><Eye size={14} />بررسی دیدگاه</BpLinkButton>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden xl:block">
        <BpTable ariaLabel="فهرست دیدگاه‌های مقالات" minWidth={880}>
          <thead>
            <tr>
              <BpTh>دیدگاه و مقاله</BpTh>
              <BpTh>نویسنده</BpTh>
              <BpTh>تعامل</BpTh>
              <BpTh>وضعیت</BpTh>
              <BpTh className="text-center">عملیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => {
              const name = authorName(comment);
              return (
                <tr key={comment.id} className="border-b border-[var(--bp-row-line)] last:border-b-0">
                  <BpTd className="max-w-[320px]">
                    <div className="min-w-0">
                      <div className="truncate font-bold" title={comment.body}>{comment.body}</div>
                      <div className="bp-muted mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px]"><MessageSquareText size={12} className="shrink-0" /><span className="truncate" title={comment.article.title}>{comment.article.title}</span></div>
                    </div>
                  </BpTd>
                  <BpTd className="max-w-[160px] truncate font-bold" title={name}>{name}</BpTd>
                  <BpTd>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="bp-muted inline-flex items-center gap-1"><MessageSquareText size={13} />{comment._count.replies.toLocaleString("fa-IR")}</span>
                      <span className="bp-muted inline-flex items-center gap-1"><ThumbsUp size={13} />{comment._count.votes.toLocaleString("fa-IR")}</span>
                    </div>
                  </BpTd>
                  <BpTd>
                    <AdminStatusBadge tone={articleCommentStatusTones[comment.status]}>{articleCommentStatusLabels[comment.status]}</AdminStatusBadge>
                    <span className="bp-muted mt-1 block text-[10px]">{formatDateTime(comment.createdAt)}</span>
                  </BpTd>
                  <BpTd className="text-center"><Link href={`/admin/article-comments/${comment.id}`} title="بررسی دیدگاه" aria-label="مشاهده و مدیریت دیدگاه" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link></BpTd>
                </tr>
              );
            })}
          </tbody>
        </BpTable>
      </div>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
