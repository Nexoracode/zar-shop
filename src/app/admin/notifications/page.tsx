import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { NOTIFICATION_TYPES, notificationTypeLabels, type NotificationType } from "@/modules/notifications/schemas";

type SearchParams = Promise<{ q?: string; type?: string; scope?: string; page?: string; pageSize?: string }>;

const scopes = ["all", "broadcast", "targeted"] as const;
type Scope = (typeof scopes)[number];
const scopeLabels: Record<Scope, string> = { all: "همه", broadcast: "فراگیر", targeted: "اختصاصی" };

function typeLabel(type: string) {
  return notificationTypeLabels[type as NotificationType] ?? type;
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("settings:manage");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = NOTIFICATION_TYPES.includes(params.type as NotificationType) ? (params.type as NotificationType) : undefined;
  const scope: Scope = scopes.includes(params.scope as Scope) ? (params.scope as Scope) : "all";
  const { requestedPage, pageSize } = await parseAdminPaginationRequest(params);

  const where: Prisma.NotificationWhereInput = {
    ...(type ? { type } : {}),
    ...(scope === "broadcast" ? { userId: null } : scope === "targeted" ? { userId: { not: null } } : {}),
    ...(query ? { OR: [{ title: { contains: query } }, { body: { contains: query } }] } : {}),
  };

  const filteredTotal = await db.notification.count({ where });
  const pagination = resolveAdminPagination(filteredTotal, requestedPage, pageSize);
  const notifications = await db.notification.findMany({
    where,
    include: { _count: { select: { reads: true } } },
    orderBy: { createdAt: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });
  const filtered = Boolean(query || type || scope !== "all");

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title="تاریخچه اعلان‌ها"
        description="اعلان‌های ارسال‌شده به کاربران (broadcast و اختصاصی)"
      />

      <section className="bp-frame relative p-4">
        <AdminListFilters
          path="/admin/notifications"
          query={query}
          queryLabel="جستجوی اعلان"
          queryPlaceholder="عنوان یا متن اعلان"
          filters={[
            {
              name: "type",
              label: "نوع اعلان",
              value: type ?? "",
              options: [{ value: "", label: "همه انواع" }, ...NOTIFICATION_TYPES.map((item) => ({ value: item, label: notificationTypeLabels[item] }))],
            },
            {
              name: "scope",
              label: "مخاطب اعلان",
              value: scope === "all" ? "" : scope,
              options: scopes.map((item) => ({ value: item === "all" ? "" : item, label: scopeLabels[item] })),
            },
          ]}
        />
      </section>

      <section className="bp-frame relative">
        {!notifications.length ? (
          <AdminEmptyState
            title="اعلانی پیدا نشد"
            description={filtered ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز اعلانی برای کاربران ارسال نشده است."}
          />
        ) : (
          <>
            <AdminReadOnlyTableToolbar
              label="فهرست فقط‌خواندنی اعلان‌ها"
              description="این فهرست فقط برای مشاهده است و اعلان‌ها قابل ویرایش یا حذف نیستند."
            />

            <div className="md:hidden">
              {notifications.map((item) => (
                <article key={item.id} className="flex flex-col gap-2 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="min-w-0 flex-1 text-[13px]">{item.title}</strong>
                    {item.userId === null
                      ? <BpTag tone="info" withDot>فراگیر</BpTag>
                      : <BpTag tone="neutral" withDot>اختصاصی</BpTag>}
                  </div>
                  <p className="bp-muted m-0 line-clamp-2 text-[12px] leading-6">{item.body}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <BpTag tone="neutral">{typeLabel(item.type)}</BpTag>
                    <span className="bp-muted">خوانده‌شده: {item._count.reads.toLocaleString("fa-IR")}</span>
                  </div>
                  <div className="bp-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span>ایجاد: {formatDateTime(item.createdAt)}</span>
                    <span>انقضا: {item.expiresAt ? formatDate(item.expiresAt) : "بدون انقضا"}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <BpTable ariaLabel="فهرست اعلان‌های کاربران" minWidth={1000}>
                <thead>
                  <tr>
                    <BpTh>عنوان</BpTh>
                    <BpTh>متن</BpTh>
                    <BpTh>نوع</BpTh>
                    <BpTh>مخاطب</BpTh>
                    <BpTh>خوانده‌شده</BpTh>
                    <BpTh>تاریخ انقضا</BpTh>
                    <BpTh>تاریخ ایجاد</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((item) => (
                    <tr key={item.id}>
                      <BpTd className="max-w-[220px]"><span className="block truncate font-bold" title={item.title}>{item.title}</span></BpTd>
                      <BpTd className="max-w-xs"><span className="bp-muted block truncate text-[12px]" title={item.body}>{item.body}</span></BpTd>
                      <BpTd><BpTag tone="neutral">{typeLabel(item.type)}</BpTag></BpTd>
                      <BpTd>
                        {item.userId === null
                          ? <BpTag tone="info" withDot>فراگیر</BpTag>
                          : <BpTag tone="neutral" withDot>اختصاصی</BpTag>}
                      </BpTd>
                      <BpTd className="text-[13px]">{item._count.reads.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="bp-muted whitespace-nowrap text-[12px]">{item.expiresAt ? formatDate(item.expiresAt) : "بدون انقضا"}</BpTd>
                      <BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(item.createdAt)}</BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </div>

            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </>
        )}
      </section>
    </div>
  );
}
