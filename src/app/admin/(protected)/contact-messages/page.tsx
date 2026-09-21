import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminClearFilters } from "@/components/admin-clear-filters";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintContactMessagesView } from "@/components/admin/blueprint/contact-messages-view";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SearchParams = Promise<{ q?: string; status?: string; page?: string; pageSize?: string }>;

export default async function AdminContactMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("orders:manage");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status === "resolved" || params.status === "open" ? params.status : undefined;
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { isResolved: status === "resolved" } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { subject: { contains: q } }, { message: { contains: q } }] } : {}),
  };
  const [filteredTotal, openCount, initialHiddenColumns] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { isResolved: false } }),
    readHiddenColumns("contactMessages"),
  ]);
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const messages = await db.contactMessage.findMany({ where, orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }], skip: pagination.skip, take: pagination.pageSize });

  return (
    <>
      <AdminPageHeader eyebrow="ارتباط با فروشگاه" title="پیام‌های تماس" description="پیام‌های ارسالی مشتریان از فرم تماس با ما را بررسی و پیگیری کنید." />

      {openCount > 0 && <div className="mb-5"><AdminPanel className="flex items-center gap-2 p-4 text-xs font-bold text-[var(--warning)]">{openCount.toLocaleString("fa-IR")} پیام هنوز بررسی نشده است.</AdminPanel></div>}

      <AdminPanel>
        <div className="border-b border-[var(--bp-divider)] p-4">
          <AdminListFilters path="/admin/contact-messages" query={q} queryLabel="جستجوی پیام" queryPlaceholder="نام، ایمیل یا متن پیام" filters={[]} large />
        </div>

        {!messages.length
          ? <AdminEmptyState title="پیامی پیدا نشد" description={q || status ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز پیامی از فرم تماس با ما ثبت نشده است."} action={q || status ? <AdminClearFilters href="/admin/contact-messages" /> : undefined} />
          : <BlueprintContactMessagesView messages={messages} pagination={pagination} initialHiddenColumns={initialHiddenColumns} status={status ?? ""} />}
      </AdminPanel>
    </>
  );
}
