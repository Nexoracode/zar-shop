import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { CalendarDays, Eye, Flag, MessageCircleReply, MessageSquareText, Star, ThumbsUp, UserRound } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TruncatedTextTooltip } from "@/components/hero";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const labels = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const tones = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

type ReviewRow = Prisma.ProductReviewGetPayload<{
  include: {
    product: { select: { name: true; sku: true } };
    user: { select: { firstName: true; lastName: true; phone: true } };
    _count: { select: { replies: true; votes: true; reports: true } };
  };
}>;

function authorName(review: ReviewRow) {
  return `${review.user.firstName ?? ""} ${review.user.lastName ?? ""}`.trim() || review.user.phone || "کاربر";
}

function authorFirstName(review: ReviewRow) {
  return review.user.firstName?.trim() || "کاربر";
}

function Rating({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-slate-400">بدون امتیاز</span>;
  return (
    <div className="flex items-center gap-1.5" aria-label={`${value} از ۵ ستاره`}>
      <Star size={15} className="fill-amber-400 text-amber-400" />
      <strong className="text-sm text-slate-700">{value.toLocaleString("fa-IR")}</strong>
      <span className="text-[10px] text-slate-400">از ۵</span>
    </div>
  );
}

function Engagement({ review }: { review: ReviewRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1"><MessageCircleReply size={13} />{review._count.replies.toLocaleString("fa-IR")}</span>
      <span className="inline-flex items-center gap-1"><ThumbsUp size={13} />{review._count.votes.toLocaleString("fa-IR")}</span>
      <span className={`inline-flex items-center gap-1 ${review._count.reports ? "font-bold text-rose-600" : ""}`}><Flag size={13} />{review._count.reports.toLocaleString("fa-IR")}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const name = authorName(review);
  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-tertiary)] text-sm font-bold text-[var(--muted)]">{name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-slate-800">{name}</strong>
            {review.isVerifiedPurchase && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">خریدار محصول</span>}
            <span className="mr-auto"><AdminStatusBadge tone={tones[review.status]}>{labels[review.status]}</AdminStatusBadge></span>
          </div>
          <span className="mt-1 block truncate text-xs text-slate-400">{review.product.name}</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50/80 p-4">
        <strong className="block text-sm leading-6 text-slate-800">{review.title || (review.parentId ? "پاسخ به دیدگاه" : "دیدگاه بدون عنوان")}</strong>
        <p className="mb-0 mt-1 line-clamp-2 break-words text-xs leading-6 text-slate-500">{review.body}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Rating value={review.rating} />
        <Engagement review={review} />
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><CalendarDays size={13} />{formatDate(review.createdAt)}</span>
        <Link href={`/admin/reviews/${review.id}`} className="mr-auto inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"><Eye size={15} />بررسی دیدگاه</Link>
      </div>
    </article>
  );
}

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
  const cell = "border-b border-slate-100 px-4 py-4 align-middle text-sm text-slate-600";
  const averageRating = ratingAggregate._avg.rating;

  return (
    <>
      <AdminPageHeader eyebrow="تعامل کاربران" title="دیدگاه‌ها و امتیازها" description="بازخورد مشتریان را بررسی کنید، پاسخ رسمی بدهید و گزارش‌های کاربران را مدیریت کنید." />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><MessageSquareText size={16} />در انتظار بررسی</span><strong className="text-xl text-slate-800">{pendingCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><ThumbsUp size={16} />تأییدشده</span><strong className="text-xl text-emerald-700">{approvedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Flag size={16} />ردشده</span><strong className="text-xl text-rose-700">{rejectedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Star size={16} />میانگین امتیاز</span><strong className="text-xl text-amber-600">{averageRating ? averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "—"}</strong><span className="mr-1 text-xs text-slate-400">از ۵</span></AdminPanel>
      </section>

      <AdminPanel className="mb-5 p-4 sm:p-5"><AdminListFilters path="/admin/reviews" query={q} queryLabel="جستجوی دیدگاه" queryPlaceholder="محصول، کاربر یا متن دیدگاه" filters={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: labels[item] }))] }]} /></AdminPanel>

      <AdminPanel>
        {!reviews.length ? <AdminEmptyState title="دیدگاهی پیدا نشد" description="هنوز دیدگاهی ثبت نشده یا فیلترهای انتخاب‌شده نتیجه‌ای ندارند." /> : (
          <>
            <div className="divide-y divide-slate-100 xl:hidden">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
            <AdminBulkEditor entity="reviews" entityLabel="دیدگاه" ids={reviews.map((review) => review.id)} actions={[{ value: "status:APPROVED", label: "تأیید و انتشار دیدگاه‌ها" }, { value: "status:REJECTED", label: "رد دیدگاه‌ها" }]} desktopClassName="hidden xl:block">
              <Table><TableContent aria-label="فهرست دیدگاه‌های محصولات" className="w-full table-fixed"><TableHeader>
                <TableColumn id="select" className="w-[5%] bg-slate-50/70 px-3 py-4 text-center"><span className="sr-only">انتخاب</span></TableColumn>
                <TableColumn id="review" isRowHeader className="w-[31%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">دیدگاه و محصول</TableColumn>
                <TableColumn id="author" className="w-[16%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">نویسنده</TableColumn>
                <TableColumn id="rating" className="w-[10%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">امتیاز</TableColumn>
                <TableColumn id="engagement" className="w-[13%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">تعامل</TableColumn>
                <TableColumn id="status" className="w-[18%] bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">وضعیت</TableColumn>
                <TableColumn id="action" className="w-[7%] bg-slate-50/70 px-4 py-4 text-center text-xs font-bold text-slate-500">عملیات</TableColumn>
              </TableHeader><TableBody>{reviews.map((review) => {
                const name = authorName(review);
                return <TableRow id={review.id} key={review.id} className="transition hover:bg-slate-50/60">
                  <TableCell className={`${cell} text-center`}><AdminBulkCheckbox id={review.id} label={`انتخاب دیدگاه ${review.title || name}`} /></TableCell>
                  <TableCell className={cell}><div className="min-w-0"><TruncatedTextTooltip text={review.title || review.body} className="font-bold text-slate-800" /><div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400"><MessageSquareText size={12} className="shrink-0" /><TruncatedTextTooltip text={review.product.name} className="max-w-full" /></div></div></TableCell>
                  <TableCell className={cell}><div className="flex min-w-0 items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500"><UserRound size={14} /></span><div className="min-w-0"><TruncatedTextTooltip text={name} displayText={authorFirstName(review)} className="font-bold text-slate-700" />{review.isVerifiedPurchase && <span className="text-[10px] text-emerald-600">خریدار محصول</span>}</div></div></TableCell>
                  <TableCell className={cell}><Rating value={review.rating} /></TableCell>
                  <TableCell className={cell}><Engagement review={review} /></TableCell>
                  <TableCell className={cell}><AdminStatusBadge tone={tones[review.status]}>{labels[review.status]}</AdminStatusBadge><span className="mt-1.5 block text-[10px] text-slate-400">{formatDateTime(review.createdAt)}</span></TableCell>
                  <TableCell className={`${cell} text-center`}><Link href={`/admin/reviews/${review.id}`} aria-label="مشاهده و مدیریت دیدگاه" title="بررسی دیدگاه" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"><Eye size={15} /></Link></TableCell>
                </TableRow>;
              })}</TableBody></TableContent></Table>
            </AdminBulkEditor>
            <AdminPagination {...pagination} />
          </>
        )}
      </AdminPanel>
    </>
  );
}
