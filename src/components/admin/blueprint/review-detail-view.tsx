import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, Flag, MessageCircleReply, ShieldCheck, Star } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { formatDateTime } from "@/lib/format";
import { reviewReportReasonLabels, reviewReportStatusLabels, reviewReportStatusTones, reviewStatusLabels, reviewStatusTones } from "@/modules/admin/labels";
import { BpTag } from "./ui";
import { BlueprintReviewManager } from "./review-manager";

type ReviewDetail = {
  id: string;
  parentId: string | null;
  title: string | null;
  body: string;
  rating: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase: boolean;
  moderationNote: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product: { name: string; sku: string; slug: string };
  user: { firstName: string | null; lastName: string | null; phone: string | null };
  moderatedBy: { firstName: string | null; lastName: string | null } | null;
  parent: { id: string; title: string | null; body: string } | null;
  replies: Array<{ id: string; body: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: Date; user: { firstName: string | null; lastName: string | null; role: string } }>;
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: "PENDING" | "RESOLVED" | "DISMISSED";
    createdAt: Date;
    user: { firstName: string | null; lastName: string | null; phone: string | null };
    resolvedBy: { firstName: string | null; lastName: string | null } | null;
  }>;
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

export function BlueprintReviewDetailView({ review }: { review: ReviewDetail }) {
  const author = `${review.user.firstName ?? ""} ${review.user.lastName ?? ""}`.trim() || review.user.phone || "کاربر";
  const moderator = review.moderatedBy ? `${review.moderatedBy.firstName ?? ""} ${review.moderatedBy.lastName ?? ""}`.trim() : null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="grid min-w-0 gap-4">
        <section className="bp-frame relative overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--bp-divider)] p-[18px] sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-divider)] text-[15px] font-bold">{author.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[14px]">{author}</strong>
                {review.isVerifiedPurchase && <BpTag tone="success"><BadgeCheck size={12} />خریدار تأییدشده</BpTag>}
              </div>
              <span className="bp-muted mt-1 block text-[12px]">{formatDateTime(review.createdAt)}</span>
            </div>
            {review.rating && (
              <div className="flex items-center gap-1 border border-[var(--bp-divider)] px-3 py-2 text-[var(--bp-warning)]" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= review.rating! ? "currentColor" : "none"} />)}
              </div>
            )}
          </div>

          <div className="p-[18px]">
            {review.parent && (
              <div className="mb-4 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <span className="bp-muted text-[11px] font-bold">در پاسخ به</span>
                <Link href={`/admin/reviews/${review.parent.id}`} className="mt-1 block text-[13px] font-bold text-[var(--bp-accent)]">{review.parent.title || review.parent.body.slice(0, 100)}</Link>
              </div>
            )}
            <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8">{review.body}</p>
          </div>

          <div className="grid gap-px border-t border-[var(--bp-divider)] bg-[var(--bp-divider)] sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">محصول</span><Link href={`/products/${review.product.slug}`} className="mt-1 block truncate text-[12px] font-bold text-[var(--bp-accent)]">{review.product.name}</Link></div>
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">کد محصول</span><span dir="ltr" className="mt-1 block truncate text-[12px] font-bold">{review.product.sku}</span></div>
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">شماره کاربر</span><span dir="ltr" className="mt-1 block truncate text-[12px] font-bold">{review.user.phone || "—"}</span></div>
            <div className="min-w-0 bg-[var(--bp-card)] p-3"><span className="bp-muted block text-[11px]">آخرین ویرایش</span><span className="mt-1 block text-[12px] font-bold">{formatDateTime(review.updatedAt)}</span></div>
          </div>

          {(review.moderationNote || moderator) && (
            <div className="border-t border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-[18px]">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--bp-warning)]" />
                <div>
                  <strong className="block text-[12px] text-[var(--bp-warning)]">یادداشت بررسی مدیریت</strong>
                  {review.moderationNote && <p className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-warning)]">{review.moderationNote}</p>}
                  {moderator && <span className="mt-1 block text-[10px] text-[var(--bp-warning)]">بررسی‌شده توسط {moderator}{review.moderatedAt ? ` در ${formatDateTime(review.moderatedAt)}` : ""}</span>}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bp-frame relative overflow-hidden">
          <SectionHeader icon={<MessageCircleReply size={16} />} title="پاسخ‌های دیدگاه" description="گفت‌وگوی شکل‌گرفته زیر این دیدگاه" count={review.replies.length} />
          {review.replies.length ? (
            <div className="divide-y divide-[var(--bp-divider)]">
              {review.replies.map((reply) => {
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
                          <AdminStatusBadge tone={reviewStatusTones[reply.status]}>{reviewStatusLabels[reply.status]}</AdminStatusBadge>
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

        <section className="bp-frame relative overflow-hidden">
          <SectionHeader icon={<Flag size={16} />} title="گزارش‌های کاربران" description="گزارش‌های ثبت‌شده و نتیجه رسیدگی مدیریت" count={review.reports.length} />
          {review.reports.length ? (
            <div className="grid gap-3 p-[15px]">
              {review.reports.map((report) => {
                const reporter = `${report.user.firstName ?? ""} ${report.user.lastName ?? ""}`.trim() || report.user.phone || "کاربر";
                const resolver = report.resolvedBy ? `${report.resolvedBy.firstName ?? ""} ${report.resolvedBy.lastName ?? ""}`.trim() : null;
                return (
                  <article key={report.id} className="border border-[var(--bp-divider)] p-[15px]">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-danger)] text-[var(--bp-danger)]"><Flag size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[13px]">{reviewReportReasonLabels[report.reason] ?? report.reason}</strong>
                          <AdminStatusBadge tone={reviewReportStatusTones[report.status]}>{reviewReportStatusLabels[report.status]}</AdminStatusBadge>
                        </div>
                        <div className="bp-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                          <span>گزارش‌دهنده: {reporter}</span>
                          <span>{formatDateTime(report.createdAt)}</span>
                          {resolver && <span>رسیدگی‌کننده: {resolver}</span>}
                        </div>
                        {report.details && <p className="bp-muted m-0 mt-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">{report.details}</p>}
                        <BlueprintReviewManager mode="report" reviewId={review.id} report={{ id: report.id, status: report.status }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-[18px] py-10 text-center">
              <Flag size={22} className="bp-muted mx-auto" />
              <p className="bp-muted m-0 mt-2 text-[12px]">گزارشی برای این دیدگاه ثبت نشده است.</p>
            </div>
          )}
        </section>
      </main>

      <aside>
        <BlueprintReviewManager mode="review" reviewId={review.id} status={review.status} title={review.title || review.body.slice(0, 80)} initialNote={review.moderationNote ?? ""} canReply={!review.parentId && review.status === "APPROVED"} />
      </aside>
    </div>
  );
}
