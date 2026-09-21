import type { Prisma } from "@generated/prisma/client";
import { Flag, MessageSquareText, ThumbsUp } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminClearFilters } from "@/components/admin-clear-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintArticleCommentsView } from "@/components/admin/blueprint/article-comments-view";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminArticleCommentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("settings:manage");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status as typeof statuses[number] : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.ArticleCommentWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { body: { contains: q } },
      { article: { is: { title: { contains: q } } } },
      { user: { is: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }] } } },
    ] } : {}),
  };
  const [filteredTotal, pendingCount, approvedCount, rejectedCount, initialHiddenColumns] = await Promise.all([
    db.articleComment.count({ where }),
    db.articleComment.count({ where: { status: "PENDING" } }),
    db.articleComment.count({ where: { status: "APPROVED" } }),
    db.articleComment.count({ where: { status: "REJECTED" } }),
    readHiddenColumns("articleComments"),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const comments = await db.articleComment.findMany({
    where,
    include: { article: { select: { title: true, slug: true } }, user: { select: { firstName: true, lastName: true, phone: true } }, _count: { select: { replies: true, votes: true } } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return (
    <>
      <AdminPageHeader eyebrow="محتوا و وبلاگ" title="دیدگاه‌های مقالات" description="دیدگاه‌های خوانندگان زیر مقالات را بررسی کنید و پاسخ رسمی فروشگاه را ثبت کنید." />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><MessageSquareText size={16} />در انتظار بررسی</span><strong className="text-xl">{pendingCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><ThumbsUp size={16} />تأییدشده</span><strong className="text-xl text-[var(--success)]">{approvedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-[var(--bp-muted)]"><Flag size={16} />ردشده</span><strong className="text-xl text-[var(--danger)]">{rejectedCount.toLocaleString("fa-IR")}</strong></AdminPanel>
      </section>

      <AdminPanel>
        <div className="border-b border-[var(--bp-divider)] p-4">
          <AdminListFilters path="/admin/article-comments" query={q} queryLabel="جستجوی دیدگاه" queryPlaceholder="عنوان مقاله، کاربر یا متن دیدگاه" filters={[]} large />
        </div>

        {!comments.length
          ? <AdminEmptyState title="دیدگاهی پیدا نشد" description={q || status ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز دیدگاهی ثبت نشده است."} action={q || status ? <AdminClearFilters href="/admin/article-comments" /> : undefined} />
          : <BlueprintArticleCommentsView comments={comments} pagination={pagination} initialHiddenColumns={initialHiddenColumns} status={status ?? ""} />}
      </AdminPanel>
    </>
  );
}
