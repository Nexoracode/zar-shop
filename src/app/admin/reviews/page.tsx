import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { requirePermission } from "@/modules/auth/session";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const labels = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const tones = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

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
  const total = await db.productReview.count({ where });
  const pagination = resolveAdminPagination(total, requestedPage, pageSize);
  const reviews = await db.productReview.findMany({
    where,
    include: { product: { select: { name: true, sku: true } }, user: { select: { firstName: true, lastName: true, phone: true } }, _count: { select: { replies: true, votes: true, reports: true } } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const cell = "border-b border-slate-100 px-4 py-4 align-middle text-sm text-slate-600";

  return <>
    <AdminPageHeader eyebrow="تعامل کاربران" title="دیدگاه‌ها و امتیازها" description="دیدگاه‌ها، پاسخ‌ها، رأی کاربران و گزارش‌های ثبت‌شده را بررسی و مدیریت کنید." />
    <AdminPanel className="mb-5 p-4 sm:p-5"><AdminListFilters path="/admin/reviews" query={q} queryLabel="جستجوی دیدگاه" queryPlaceholder="محصول، کاربر یا متن دیدگاه" filters={[{ name: "status", label: "وضعیت", value: status ?? "", options: [{ value: "", label: "همه وضعیت‌ها" }, ...statuses.map((item) => ({ value: item, label: labels[item] }))] }]} /></AdminPanel>
    <AdminPanel>{!reviews.length ? <AdminEmptyState title="دیدگاهی پیدا نشد" description="هنوز دیدگاهی ثبت نشده یا فیلترهای انتخاب‌شده نتیجه‌ای ندارند." /> : <>
      <Table><TableScrollContainer><TableContent aria-label="فهرست دیدگاه‌های محصولات" className="w-full min-w-[1050px]"><TableHeader>{["ردیف", "محصول", "کاربر", "دیدگاه", "امتیاز", "وضعیت", "تعامل", "تاریخ", "جزئیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 3} className="bg-slate-50/70 px-4 py-4 text-right text-xs font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{reviews.map((review, index) => {
        const name = `${review.user.firstName ?? ""} ${review.user.lastName ?? ""}`.trim() || review.user.phone || "کاربر";
        return <TableRow id={review.id} key={review.id} className="transition hover:bg-slate-50/60">
          <TableCell className={`${cell} w-14 text-slate-400`}>{(pagination.skip + index + 1).toLocaleString("fa-IR")}</TableCell>
          <TableCell className={`${cell} w-56 max-w-56`}><TruncatedTextTooltip text={review.product.name} className="max-w-48 font-bold text-slate-800" /><span dir="ltr" className="mt-1 block text-right text-[10px] text-slate-400">{review.product.sku}</span></TableCell>
          <TableCell className={`${cell} w-40 max-w-40`}><TruncatedTextTooltip text={name} className="max-w-36" /></TableCell>
          <TableCell className={`${cell} w-72 max-w-72`}><TruncatedTextTooltip text={review.title || review.body} className="max-w-64 font-bold text-slate-700" />{review.parentId && <span className="mt-1 block text-[10px] text-slate-400">پاسخ به دیدگاه</span>}</TableCell>
          <TableCell className={cell}>{review.rating ? `${review.rating.toLocaleString("fa-IR")} از ۵` : "—"}</TableCell>
          <TableCell className={cell}><AdminStatusBadge tone={tones[review.status]}>{labels[review.status]}</AdminStatusBadge></TableCell>
          <TableCell className={`${cell} whitespace-nowrap text-xs`}>{review._count.replies.toLocaleString("fa-IR")} پاسخ · {review._count.votes.toLocaleString("fa-IR")} رأی · <span className={review._count.reports ? "font-bold text-rose-600" : ""}>{review._count.reports.toLocaleString("fa-IR")} گزارش</span></TableCell>
          <TableCell className={`${cell} whitespace-nowrap text-xs`}>{formatDateTime(review.createdAt)}</TableCell>
          <TableCell className={cell}><Link href={`/admin/reviews/${review.id}`} aria-label="مشاهده و مدیریت دیدگاه" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"><Eye size={15} /></Link></TableCell>
        </TableRow>;
      })}</TableBody></TableContent></TableScrollContainer></Table>
      <AdminPagination {...pagination} />
    </>}</AdminPanel>
  </>;
}
