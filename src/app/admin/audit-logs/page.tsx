import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { db } from "@/lib/db";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { auditActionLabel } from "@/modules/audit/audit-log";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintAuditLogsView } from "@/components/admin/blueprint/audit-logs-view";

type SearchParams = Promise<{ q?: string; action?: string; page?: string; pageSize?: string }>;

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("audit:view");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const action = params.action?.trim() ?? "";
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(query ? { OR: [
      { action: { contains: query } },
      { entityType: { contains: query } },
      { entityId: { contains: query } },
      { actor: { is: { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }, { phone: { contains: query } }] } } },
    ] } : {}),
  };
  const [totalItems, actionRows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
  ]);
  const pagination = resolveAdminPagination(totalItems, requestedPage, pageSize);
  const logs = await db.auditLog.findMany({
    where,
    include: { actor: { select: { firstName: true, lastName: true, phone: true, role: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return <>
    <AdminPageHeader eyebrow="نظارت و امنیت" title="تاریخچه فعالیت‌ها" description="تمام عملیات ثبت، ویرایش، حذف و دسترسی کاربران پنل را با جزئیات بررسی کنید." />
    <AdminPanel className="mb-5 p-4 sm:p-5"><AdminListFilters path="/admin/audit-logs" query={query} queryLabel="جستجوی فعالیت" queryPlaceholder="نام مدیر، عملیات، موجودیت یا شناسه" filters={[{ name: "action", label: "نوع فعالیت", value: action, options: [{ value: "", label: "همه فعالیت‌ها" }, ...actionRows.map((item) => ({ value: item.action, label: auditActionLabel(item.action) }))] }]} /></AdminPanel>
    <AdminPanel>
      {!logs.length
        ? <AdminEmptyState title="فعالیتی پیدا نشد" description={query || action ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز فعالیت مدیریتی ثبت نشده است."} />
        : <BlueprintAuditLogsView logs={logs} pagination={pagination} />}
    </AdminPanel>
  </>;
}
