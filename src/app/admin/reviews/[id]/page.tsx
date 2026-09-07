import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Flag, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { BlueprintReviewDetailView } from "@/components/admin/blueprint/review-detail-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

const statusLabel = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const statusTone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

function MetricCard({ icon, label, children, tone = "" }: { icon: ReactNode; label: string; children: ReactNode; tone?: string }) {
  return (
    <AdminPanel className="p-4">
      <span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]">{icon}{label}</span>
      <strong className={`text-base ${tone}`.trim()}>{children}</strong>
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
        <MetricCard icon={<Star size={16} />} label="امتیاز ثبت‌شده" tone="text-[var(--warning)]">{review.rating ? `${review.rating.toLocaleString("fa-IR")} از ۵` : "بدون امتیاز"}</MetricCard>
        <MetricCard icon={<ThumbsUp size={16} />} label="رأی مثبت" tone="text-[var(--success)]">{likes.toLocaleString("fa-IR")}</MetricCard>
        <MetricCard icon={<ThumbsDown size={16} />} label="رأی منفی" tone="text-[var(--danger)]">{dislikes.toLocaleString("fa-IR")}</MetricCard>
        <MetricCard icon={<Flag size={16} />} label="گزارش نیازمند رسیدگی" tone={pendingReports ? "text-[var(--danger)]" : ""}>{pendingReports.toLocaleString("fa-IR")}</MetricCard>
      </section>

      <BlueprintReviewDetailView review={review} />
    </>
  );
}
