import type { Prisma } from "@generated/prisma/client";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminClearFilters } from "@/components/admin-clear-filters";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminPagination } from "@/components/admin-pagination";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { NOTIFICATION_TYPES, notificationTypeLabels, type NotificationType } from "@/modules/notifications/schemas";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SearchParams = Promise<{ q?: string; type?: string; scope?: string; page?: string; pageSize?: string }>;

const scopes = ["all", "broadcast", "targeted"] as const;
type Scope = (typeof scopes)[number];
const scopeLabels: Record<Scope, string> = { all: "همه", broadcast: "فراگیر", targeted: "اختصاصی" };

const NOTIFICATIONS_TABLE_ID = "notifications";

const notificationColumns = [
  { id: "title", label: "عنوان" },
  { id: "body", label: "متن" },
  { id: "type", label: "نوع" },
  { id: "scope", label: "مخاطب" },
  { id: "reads", label: "خوانده‌شده" },
  { id: "expiresAt", label: "تاریخ انقضا" },
  { id: "createdAt", label: "تاریخ ایجاد" },
];

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

  const [filteredTotal, initialHiddenColumns] = await Promise.all([db.notification.count({ where }), readHiddenColumns(NOTIFICATIONS_TABLE_ID)]);
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
          filters={[]}
        />
      </section>

      <section className="bp-frame relative">
        {!notifications.length ? (
          <AdminEmptyState
            title="اعلانی پیدا نشد"
            description={filtered ? "فیلترها را تغییر دهید و دوباره جستجو کنید." : "هنوز اعلانی برای کاربران ارسال نشده است."}
            action={filtered ? <AdminClearFilters href="/admin/notifications" /> : undefined}
          />
        ) : (
          <AdminColumnVisibility tableId={NOTIFICATIONS_TABLE_ID} columns={notificationColumns} initialHidden={initialHiddenColumns}>
            <AdminReadOnlyTableToolbar
              label="فهرست فقط‌خواندنی اعلان‌ها"
              description="این فهرست فقط برای مشاهده است و اعلان‌ها قابل ویرایش یا حذف نیستند."
              leading={<AdminColumnSettingsButton />}
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
                    <AdminColumn id="title"><BpTh>عنوان</BpTh></AdminColumn>
                    <AdminColumn id="body"><BpTh>متن</BpTh></AdminColumn>
                    <AdminColumn id="type"><BpTh><span className="inline-flex items-center">نوع<AdminColumnFilter path="/admin/notifications" ariaLabel="فیلتر نوع اعلان" groups={[{ name: "type", label: "نوع اعلان", value: type ?? "", options: [{ value: "", label: "همه انواع" }, ...NOTIFICATION_TYPES.map((item) => ({ value: item, label: notificationTypeLabels[item] }))] }]} /></span></BpTh></AdminColumn>
                    <AdminColumn id="scope"><BpTh><span className="inline-flex items-center">مخاطب<AdminColumnFilter path="/admin/notifications" ariaLabel="فیلتر مخاطب اعلان" groups={[{ name: "scope", label: "مخاطب اعلان", value: scope === "all" ? "" : scope, options: scopes.map((item) => ({ value: item === "all" ? "" : item, label: scopeLabels[item] })) }]} /></span></BpTh></AdminColumn>
                    <AdminColumn id="reads"><BpTh>خوانده‌شده</BpTh></AdminColumn>
                    <AdminColumn id="expiresAt"><BpTh>تاریخ انقضا</BpTh></AdminColumn>
                    <AdminColumn id="createdAt"><BpTh>تاریخ ایجاد</BpTh></AdminColumn>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((item) => (
                    <tr key={item.id}>
                      <AdminColumn id="title"><BpTd className="max-w-[220px]"><span className="block truncate font-bold" title={item.title}>{item.title}</span></BpTd></AdminColumn>
                      <AdminColumn id="body"><BpTd className="max-w-xs"><span className="bp-muted block truncate text-[12px]" title={item.body}>{item.body}</span></BpTd></AdminColumn>
                      <AdminColumn id="type"><BpTd><BpTag tone="neutral">{typeLabel(item.type)}</BpTag></BpTd></AdminColumn>
                      <AdminColumn id="scope">
                        <BpTd>
                          {item.userId === null
                            ? <BpTag tone="info" withDot>فراگیر</BpTag>
                            : <BpTag tone="neutral" withDot>اختصاصی</BpTag>}
                        </BpTd>
                      </AdminColumn>
                      <AdminColumn id="reads"><BpTd className="text-[13px]">{item._count.reads.toLocaleString("fa-IR")}</BpTd></AdminColumn>
                      <AdminColumn id="expiresAt"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{item.expiresAt ? formatDate(item.expiresAt) : "بدون انقضا"}</BpTd></AdminColumn>
                      <AdminColumn id="createdAt"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(item.createdAt)}</BpTd></AdminColumn>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </div>

            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
          </AdminColumnVisibility>
        )}
      </section>
    </div>
  );
}
