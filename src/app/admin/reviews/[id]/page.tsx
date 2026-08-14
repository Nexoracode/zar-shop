import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Flag, MessageCircleReply, ShieldCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminReviewManager } from "@/components/admin-review-manager";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";

const statusLabel = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const statusTone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;
const reportLabel = { SPAM: "هرزنامه", ABUSE: "توهین‌آمیز", MISINFORMATION: "اطلاعات نادرست", IRRELEVANT: "نامرتبط", OTHER: "سایر موارد" } as Record<string, string>;
const reportStatusLabel = { PENDING: "در انتظار رسیدگی", RESOLVED: "رسیدگی‌شده", DISMISSED: "ردشده" } as const;
const reportStatusTone = { PENDING: "warning", RESOLVED: "success", DISMISSED: "neutral" } as const;

function SectionHeader({ icon, title, description, count }: { icon: ReactNode; title: string; description?: string; count?: number }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-tertiary)] text-[var(--accent)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-sm font-black text-slate-800 sm:text-base">{title}</h2>
        {description && <p className="mb-0 mt-1 text-xs leading-5 text-slate-400">{description}</p>}
      </div>
      {typeof count === "number" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{count.toLocaleString("fa-IR")}</span>}
    </div>
  );
}

function MetricCard({ icon, label, children, tone = "text-slate-700" }: { icon: ReactNode; label: string; children: ReactNode; tone?: string }) {
  return (
    <AdminPanel className="p-4">
      <span className="mb-2 flex items-center gap-2 text-xs text-slate-400">{icon}{label}</span>
      <strong className={`text-base ${tone}`}>{children}</strong>
    </AdminPanel>
  );
}

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog:manage");
  const { id } = await params;
  const review = await db.productReview.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, sku: true, slug: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
      moderatedBy: { select: { firstName: true, lastName: true } },
      parent: { select: { id: true, title: true, body: true } },
      replies: { include: { user: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "asc" } },
      reports: { include: { user: { select: { firstName: true, lastName: true, phone: true } }, resolvedBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
      votes: { select: { value: true } },
    },
  });
  if (!review) notFound();

  const author = `${review.user.firstName ?? ""} ${review.user.lastName ?? ""}`.trim() || review.user.phone || "کاربر";
  const moderator = review.moderatedBy ? `${review.moderatedBy.firstName ?? ""} ${review.moderatedBy.lastName ?? ""}`.trim() : null;
  const likes = review.votes.filter((vote) => vote.value === 1).length;
  const dislikes = review.votes.filter((vote) => vote.value === -1).length;
  const pendingReports = review.reports.filter((report) => report.status === "PENDING").length;

  return (
    <>
      <AdminPageHeader
        eyebrow="بررسی بازخورد"
        title={review.title || (review.parentId ? "پاسخ کاربر" : "دیدگاه بدون عنوان")}
        description={`دیدگاه ${author} درباره محصول «${review.product.name}»`}
        backHref="/admin/reviews"
        backLabel="بازگشت به دیدگاه‌ها"
        action={<AdminStatusBadge tone={statusTone[review.status]}>{statusLabel[review.status]}</AdminStatusBadge>}
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Star size={16} />} label="امتیاز ثبت‌شده" tone="text-amber-600">{review.rating ? `${review.rating.toLocaleString("fa-IR")} از ۵` : "بدون امتیاز"}</MetricCard>
        <MetricCard icon={<ThumbsUp size={16} />} label="رأی مثبت" tone="text-emerald-700">{likes.toLocaleString("fa-IR")}</MetricCard>
        <MetricCard icon={<ThumbsDown size={16} />} label="رأی منفی" tone="text-rose-700">{dislikes.toLocaleString("fa-IR")}</MetricCard>
        <MetricCard icon={<Flag size={16} />} label="گزارش نیازمند رسیدگی" tone={pendingReports ? "text-rose-700" : "text-slate-700"}>{pendingReports.toLocaleString("fa-IR")}</MetricCard>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-5">
          <AdminPanel>
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-tertiary)] text-lg font-black text-[var(--muted)]">{author.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><strong className="text-base text-slate-800">{author}</strong>{review.isVerifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><BadgeCheck size={13} />خریدار تأییدشده</span>}</div>
                <span className="mt-1 block text-xs text-slate-400">{formatDateTime(review.createdAt)}</span>
              </div>
              {review.rating && <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-amber-500" dir="ltr">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= review.rating! ? "currentColor" : "none"} />)}</div>}
            </div>

            <div className="p-5 sm:p-6">
              {review.parent && <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-[11px] font-bold text-slate-400">در پاسخ به</span><Link href={`/admin/reviews/${review.parent.id}`} className="mt-1 block text-sm font-bold text-[var(--accent)]">{review.parent.title || review.parent.body.slice(0, 100)}</Link></div>}
              <p className="mb-0 whitespace-pre-wrap break-words text-sm leading-8 text-slate-700 sm:text-[15px]">{review.body}</p>
            </div>

            <dl className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 bg-white p-4 sm:px-5"><dt className="text-[11px] text-slate-400">محصول</dt><dd className="mt-1 min-w-0"><Link href={`/products/${review.product.slug}`} className="block truncate text-xs font-bold text-[var(--accent)]">{review.product.name}</Link></dd></div>
              <div className="min-w-0 bg-white p-4 sm:px-5"><dt className="text-[11px] text-slate-400">کد محصول</dt><dd className="mt-1 truncate text-left text-xs font-bold text-slate-700" dir="ltr">{review.product.sku}</dd></div>
              <div className="min-w-0 bg-white p-4 sm:px-5"><dt className="text-[11px] text-slate-400">شماره کاربر</dt><dd className="mt-1 truncate text-left text-xs font-bold text-slate-700" dir="ltr">{review.user.phone || "—"}</dd></div>
              <div className="min-w-0 bg-white p-4 sm:px-5"><dt className="text-[11px] text-slate-400">آخرین ویرایش</dt><dd className="mt-1 text-xs font-bold text-slate-700">{formatDateTime(review.updatedAt)}</dd></div>
            </dl>

            {(review.moderationNote || moderator) && <div className="border-t border-amber-100 bg-amber-50/70 px-5 py-4 sm:px-6"><div className="flex items-start gap-2"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><strong className="block text-xs text-amber-900">یادداشت بررسی مدیریت</strong>{review.moderationNote && <p className="mb-0 mt-1 text-xs leading-6 text-amber-800">{review.moderationNote}</p>}{moderator && <span className="mt-1 block text-[10px] text-amber-700">بررسی‌شده توسط {moderator}{review.moderatedAt ? ` در ${formatDateTime(review.moderatedAt)}` : ""}</span>}</div></div></div>}
          </AdminPanel>

          <AdminPanel>
            <SectionHeader icon={<MessageCircleReply size={18} />} title="پاسخ‌های دیدگاه" description="گفت‌وگوی شکل‌گرفته زیر این دیدگاه" count={review.replies.length} />
            {review.replies.length ? <div className="divide-y divide-slate-100">{review.replies.map((reply) => {
              const name = `${reply.user.firstName ?? ""} ${reply.user.lastName ?? ""}`.trim() || "کاربر";
              const isManagement = reply.user.role !== "CUSTOMER";
              return <article key={reply.id} className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-black ${isManagement ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-slate-100 text-slate-500"}`}>{name.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-slate-800">{name}</strong>{isManagement && <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">مدیریت فروشگاه</span>}<AdminStatusBadge tone={statusTone[reply.status]}>{statusLabel[reply.status]}</AdminStatusBadge><span className="mr-auto text-[10px] text-slate-400">{formatDateTime(reply.createdAt)}</span></div><p className="mb-0 mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{reply.body}</p></div></div></article>;
            })}</div> : <div className="px-5 py-10 text-center"><MessageCircleReply size={24} className="mx-auto text-slate-300" /><p className="mb-0 mt-2 text-xs text-slate-400">هنوز پاسخی برای این دیدگاه ثبت نشده است.</p></div>}
          </AdminPanel>

          <AdminPanel>
            <SectionHeader icon={<Flag size={18} />} title="گزارش‌های کاربران" description="گزارش‌های ثبت‌شده و نتیجه رسیدگی مدیریت" count={review.reports.length} />
            {review.reports.length ? <div className="grid gap-3 p-4 sm:p-5">{review.reports.map((report) => {
              const reporter = `${report.user.firstName ?? ""} ${report.user.lastName ?? ""}`.trim() || report.user.phone || "کاربر";
              const resolver = report.resolvedBy ? `${report.resolvedBy.firstName ?? ""} ${report.resolvedBy.lastName ?? ""}`.trim() : null;
              return <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><Flag size={16} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800">{reportLabel[report.reason] ?? report.reason}</strong><AdminStatusBadge tone={reportStatusTone[report.status]}>{reportStatusLabel[report.status]}</AdminStatusBadge></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400"><span>گزارش‌دهنده: {reporter}</span><span>{formatDateTime(report.createdAt)}</span>{resolver && <span>رسیدگی‌کننده: {resolver}</span>}</div>{report.details && <p className="mb-0 mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">{report.details}</p>}<AdminReviewManager mode="report" reviewId={review.id} report={{ id: report.id, status: report.status }} /></div></div></article>;
            })}</div> : <div className="px-5 py-10 text-center"><Flag size={24} className="mx-auto text-slate-300" /><p className="mb-0 mt-2 text-xs text-slate-400">گزارشی برای این دیدگاه ثبت نشده است.</p></div>}
          </AdminPanel>
        </main>

        <aside><AdminReviewManager mode="review" reviewId={review.id} status={review.status} title={review.title || review.body.slice(0, 80)} initialNote={review.moderationNote ?? ""} canReply={!review.parentId && review.status === "APPROVED"} /></aside>
      </div>
    </>
  );
}
