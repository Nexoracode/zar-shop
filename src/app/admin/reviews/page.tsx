import type { Prisma } from "@generated/prisma/client";
import { Flag, MessageSquareText, Star, ThumbsUp } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintReviewsView } from "@/components/admin/blueprint/reviews-view";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const labels = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("catalog:manage");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status as typeof statuses[number] : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.ProductReviewWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { title: { contains: q } },
      { body: { contains: q } },
      { product: { is: { name: { contains: q } } } },
      { user: { is: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }] } } },
    ] } : {}),
  };
  const [filteredTotal, pendingCount, approvedCount, rejectedCount, ratingAggregate] = await Promise.all([
    db.productReview.count({ where }),
    db.productReview.count({ where: { status: "PENDING" } }),
    db.productReview.count({ where: { status: "APPROVED" } }),
    db.productReview.count({ where: { status: "REJECTED" } }),
    db.productReview.aggregate({ where: { status: "APPROVED", rating: { not: null } }, _avg: { rating: true } }),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const reviews = await db.productReview.findMany({
    where,
    include: { product: { select: { name: true, sku: true } }, user: { select: { firstName: true, lastName: true, phone: true } }, _count: { select: { replies: true, votes: true, reports: true } } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const averageRating = ratingAggregate._avg.rating;

  return (
    <>
      <AdminPageHeader eyebrow="تعامل کاربران" title="دیدگاه‌ها و امتیازها" description="بازخورد مشتریان را بررسی کنید، پاسخ رسمی بدهید و گزارش‌های کاربران را مدیریت کنید." />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><MessageSquareText size={16} />در انتظار بررسی</span><strong className="text-xl">{pendingCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><ThumbsUp size={16} />تأییدشده</span><strong className="text-xl text-[var(--success)]">{approvedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><Flag size={16} />ردشده</span><strong className="text-xl text-[var(--danger)]">{rejectedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><Star size={16} />میانگین امتیاز</span><strong className="text-xl text-[var(--warning)]">{averageRating ? averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "—"}</strong><span className="mr-1 text-xs text-[var(--bp-muted)]">از ۵</span></AdminPanel>
      </section>

      <AdminPanel className="mb-5 p-4 sm:p-5"><AdminListFilters path="/admin/reviews" query={q} queryLabel="جستجوی دیدگاه" queryPlaceholder="محصول، کاربر یا متن دیدگاه" filters={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: labels[item] }))] }]} /></AdminPanel>

      <AdminPanel>
        {!reviews.length
          ? <AdminEmptyState title="دیدگاهی پیدا نشد" description="هنوز دیدگاهی ثبت نشده یا فیلترهای انتخاب‌شده نتیجه‌ای ندارند." />
          : <BlueprintReviewsView reviews={reviews} pagination={pagination} />}
      </AdminPanel>
    </>
  );
}
