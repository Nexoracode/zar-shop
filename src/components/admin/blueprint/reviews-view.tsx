import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { Eye, Flag, MessageCircleReply, MessageSquareText, Star, ThumbsUp, UserRound } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDate, formatDateTime } from "@/lib/format";
import { reviewStatusLabels, reviewStatusTones } from "@/modules/admin/labels";
import { BpLinkButton, BpTable, BpTag, BpTd, BpTh } from "./ui";

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

function Rating({ value }: { value: number | null }) {
  if (!value) return <span className="bp-muted text-[12px]">بدون امتیاز</span>;
  return (
    <div className="flex items-center gap-1.5" aria-label={`${value} از ۵ ستاره`}>
      <Star size={14} className="fill-[var(--bp-warning)] text-[var(--bp-warning)]" />
      <strong className="text-[13px]">{value.toLocaleString("fa-IR")}</strong>
      <span className="bp-muted text-[10px]">از ۵</span>
    </div>
  );
}

function Engagement({ review }: { review: ReviewRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      <span className="bp-muted inline-flex items-center gap-1"><MessageCircleReply size={13} />{review._count.replies.toLocaleString("fa-IR")}</span>
      <span className="bp-muted inline-flex items-center gap-1"><ThumbsUp size={13} />{review._count.votes.toLocaleString("fa-IR")}</span>
      <span className={`inline-flex items-center gap-1 ${review._count.reports ? "font-bold text-[var(--bp-danger)]" : "bp-muted"}`}><Flag size={13} />{review._count.reports.toLocaleString("fa-IR")}</span>
    </div>
  );
}

export function BlueprintReviewsView({ reviews, pagination }: { reviews: ReviewRow[]; pagination: ReturnType<typeof resolveAdminPagination> }) {
  return (
    <>
      <div className="xl:hidden">
        {reviews.map((review) => {
          const name = authorName(review);
          return (
            <article key={review.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[13px] font-bold"><UserRound size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-[13px]">{name}</strong>
                    {review.isVerifiedPurchase && <BpTag tone="success">خریدار محصول</BpTag>}
                    <span className="me-auto"><AdminStatusBadge tone={reviewStatusTones[review.status]}>{reviewStatusLabels[review.status]}</AdminStatusBadge></span>
                  </div>
                  <span className="bp-muted mt-0.5 block truncate text-[11px]">{review.product.name}</span>
                </div>
              </div>
              <div className="mt-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <strong className="block text-[13px] leading-6">{review.title || (review.parentId ? "پاسخ به دیدگاه" : "دیدگاه بدون عنوان")}</strong>
                <p className="bp-muted m-0 mt-1 line-clamp-2 break-words text-[12px] leading-6">{review.body}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Rating value={review.rating} />
                <Engagement review={review} />
                <span className="bp-muted text-[11px]">{formatDate(review.createdAt)}</span>
                <BpLinkButton href={`/admin/reviews/${review.id}`} size="sm" className="ms-auto gap-1.5"><Eye size={14} />بررسی دیدگاه</BpLinkButton>
              </div>
            </article>
          );
        })}
      </div>

      <AdminBulkEditor entity="reviews" entityLabel="دیدگاه" ids={reviews.map((review) => review.id)} actions={[{ value: "status:APPROVED", label: "تأیید و انتشار دیدگاه‌ها" }, { value: "status:REJECTED", label: "رد دیدگاه‌ها" }]} desktopClassName="hidden xl:block">
        <BpTable ariaLabel="فهرست دیدگاه‌های محصولات" minWidth={960}>
          <thead>
            <tr>
              <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
              <BpTh>دیدگاه و محصول</BpTh>
              <BpTh>نویسنده</BpTh>
              <BpTh>امتیاز</BpTh>
              <BpTh>تعامل</BpTh>
              <BpTh>وضعیت</BpTh>
              <BpTh className="text-center">عملیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => {
              const name = authorName(review);
              return (
                <AdminBulkTr key={review.id} id={review.id}>
                  <BpTd className="w-10 text-center"><AdminBulkCheckbox id={review.id} label={`انتخاب دیدگاه ${review.title || name}`} /></BpTd>
                  <BpTd className="max-w-[280px]">
                    <div className="min-w-0">
                      <div className="truncate font-bold" title={review.title || review.body}>{review.title || review.body}</div>
                      <div className="bp-muted mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px]"><MessageSquareText size={12} className="shrink-0" /><span className="truncate" title={review.product.name}>{review.product.name}</span></div>
                    </div>
                  </BpTd>
                  <BpTd>
                    <div className="min-w-0">
                      <div className="truncate font-bold" title={name}>{name}</div>
                      {review.isVerifiedPurchase && <span className="text-[10px] text-[var(--bp-success)]">خریدار محصول</span>}
                    </div>
                  </BpTd>
                  <BpTd><Rating value={review.rating} /></BpTd>
                  <BpTd><Engagement review={review} /></BpTd>
                  <BpTd>
                    <AdminStatusBadge tone={reviewStatusTones[review.status]}>{reviewStatusLabels[review.status]}</AdminStatusBadge>
                    <span className="bp-muted mt-1 block text-[10px]">{formatDateTime(review.createdAt)}</span>
                  </BpTd>
                  <BpTd className="text-center"><Link href={`/admin/reviews/${review.id}`} title="بررسی دیدگاه" aria-label="مشاهده و مدیریت دیدگاه" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} /></Link></BpTd>
                </AdminBulkTr>
              );
            })}
          </tbody>
        </BpTable>
      </AdminBulkEditor>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </>
  );
}
