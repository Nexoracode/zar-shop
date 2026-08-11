import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminReviewManager } from "@/components/admin-review-manager";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";

const statusLabel = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const statusTone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;
const reportLabel = { SPAM: "هرزنامه", ABUSE: "توهین‌آمیز", MISINFORMATION: "اطلاعات نادرست", IRRELEVANT: "نامرتبط", OTHER: "سایر موارد" } as Record<string, string>;

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
  const likes = review.votes.filter((vote) => vote.value === 1).length;
  const dislikes = review.votes.filter((vote) => vote.value === -1).length;

  return <>
    <AdminPageHeader eyebrow="تعامل کاربران" title={review.title || "پاسخ دیدگاه"} description={`دیدگاه ${author} برای محصول «${review.product.name}»`} backHref="/admin/reviews" backLabel="بازگشت به دیدگاه‌ها" />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <AdminPanel className="p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center gap-3"><AdminStatusBadge tone={statusTone[review.status]}>{statusLabel[review.status]}</AdminStatusBadge>{review.rating && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{review.rating.toLocaleString("fa-IR")} از ۵</span>}<span className="mr-auto text-xs text-slate-400">{formatDateTime(review.createdAt)}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">{review.body}</p><dl className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3"><div><dt className="text-slate-400">کاربر</dt><dd className="mt-1 font-bold text-slate-700">{author}</dd></div><div><dt className="text-slate-400">نوع کاربر</dt><dd className="mt-1 font-bold text-slate-700">{review.isVerifiedPurchase ? "خریدار محصول" : "کاربر عادی"}</dd></div><div><dt className="text-slate-400">رأی کاربران</dt><dd className="mt-1 font-bold text-slate-700">{likes.toLocaleString("fa-IR")} مثبت · {dislikes.toLocaleString("fa-IR")} منفی</dd></div></dl>{review.moderationNote && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><strong className="block">یادداشت مدیریت</strong>{review.moderationNote}</div>}</AdminPanel>
        {review.replies.length > 0 && <AdminPanel className="p-5"><h2 className="mb-4 text-sm font-black">پاسخ‌ها</h2><div className="relative mr-3 border-r-2 border-slate-200 pr-6">{review.replies.map((reply) => { const name = `${reply.user.firstName ?? ""} ${reply.user.lastName ?? ""}`.trim() || "کاربر"; return <article key={reply.id} className="relative border-b border-slate-100 py-4 before:absolute before:-right-6 before:top-7 before:w-5 before:border-t-2 before:border-slate-200"><div className="mb-2 flex items-center gap-2"><strong className="text-xs">{name}</strong>{reply.user.role !== "CUSTOMER" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">مدیریت</span>}<AdminStatusBadge tone={statusTone[reply.status]}>{statusLabel[reply.status]}</AdminStatusBadge><span className="mr-auto text-[10px] text-slate-400">{formatDateTime(reply.createdAt)}</span></div><p className="whitespace-pre-wrap text-xs leading-7 text-slate-600">{reply.body}</p></article>; })}</div></AdminPanel>}
        <AdminPanel className="p-5"><h2 className="mb-4 text-sm font-black">گزارش‌های کاربران</h2>{review.reports.length ? <div className="grid gap-3">{review.reports.map((report) => { const reporter = `${report.user.firstName ?? ""} ${report.user.lastName ?? ""}`.trim() || report.user.phone || "کاربر"; return <article key={report.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-slate-800">{reportLabel[report.reason] ?? report.reason}</strong><span className="text-[10px] text-slate-400">توسط {reporter}</span><span className="mr-auto text-[10px] text-slate-400">{formatDateTime(report.createdAt)}</span></div>{report.details && <p className="mb-0 mt-3 text-xs leading-6 text-slate-600">{report.details}</p>}<AdminReviewManager mode="report" reviewId={review.id} report={{ id: report.id, status: report.status }} /></article>; })}</div> : <p className="text-xs text-slate-400">گزارشی برای این دیدگاه ثبت نشده است.</p>}</AdminPanel>
      </div>
      <AdminReviewManager mode="review" reviewId={review.id} status={review.status} title={review.title || review.body.slice(0, 80)} canReply={!review.parentId && review.status === "APPROVED"} />
    </div>
  </>;
}
