import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { Eye, History } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { AdminReadOnlyTableToolbar } from "@/components/admin-table-refresh";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { AdminColumnFilter } from "@/components/admin-column-filter";
import { AdminPagination } from "@/components/admin-pagination";
import type { resolveAdminPagination } from "@/lib/admin-pagination";
import { formatDateTime } from "@/lib/format";
import { auditActionKind, auditActionLabel, auditActorName, auditEntityLabel } from "@/modules/audit/audit-log";
import { BpTable, BpTd, BpTh } from "./ui";

type AuditRow = Prisma.AuditLogGetPayload<{ include: { actor: { select: { firstName: true; lastName: true; phone: true; role: true } } } }>;

const kindLabels = { CREATE: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف", ACCESS: "دسترسی", SYSTEM: "سیستمی" } as const;
const kindTones = { CREATE: "success", UPDATE: "info", DELETE: "danger", ACCESS: "gold", SYSTEM: "neutral" } as const;

function DetailLink({ id, label }: { id: string; label: string }) {
  return <Link href={`/admin/audit-logs/${id}`} aria-label={`مشاهده جزئیات ${label}`} title="مشاهده جزئیات" className="bp-btn bp-btn-ghost bp-btn-icon bp-btn-sm"><Eye size={15} strokeWidth={1.5} /></Link>;
}

const AUDIT_LOGS_TABLE_ID = "auditLogs";

const auditLogColumns = [
  { id: "actor", label: "کاربر پنل" },
  { id: "action", label: "فعالیت" },
  { id: "kind", label: "نوع" },
  { id: "entity", label: "موجودیت" },
  { id: "time", label: "زمان" },
];

export function BlueprintAuditLogsView({ logs, pagination, initialHiddenColumns, action, actionOptions }: { logs: AuditRow[]; pagination: ReturnType<typeof resolveAdminPagination>; initialHiddenColumns: string[]; /** The activity type currently filtered on, or "". */ action: string; actionOptions: { value: string; label: string }[] }) {
  return (
    <AdminColumnVisibility tableId={AUDIT_LOGS_TABLE_ID} columns={auditLogColumns} initialHidden={initialHiddenColumns}>
      <AdminReadOnlyTableToolbar label="تاریخچه غیرقابل‌ویرایش" description="برای حفظ زنجیره نظارتی، رویدادها فقط قابل مشاهده و بروزرسانی هستند." trailing={<AdminColumnSettingsButton />} />

      <div className="md:hidden">
        {logs.map((log) => {
          const kind = auditActionKind(log.action);
          return (
            <Link key={log.id} href={`/admin/audit-logs/${log.id}`} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><History size={16} /></span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[13px]">{auditActorName(log.actor)}</strong>
                    <span dir="ltr" className="bp-muted block truncate text-right text-[11px]">{log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"}</span>
                  </span>
                </span>
                <AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge>
              </div>
              <div className="flex items-end justify-between gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <div>
                  <span className="block text-[12px] font-bold">{auditActionLabel(log.action)} · {auditEntityLabel(log.entityType)}</span>
                  <span className="bp-muted mt-1 block text-[11px]">{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block">
        <BpTable ariaLabel="تاریخچه فعالیت کاربران پنل" minWidth={920}>
          <thead>
            <tr>
              <BpTh className="w-10">#</BpTh>
              <AdminColumn id="actor"><BpTh>کاربر پنل</BpTh></AdminColumn>
              <AdminColumn id="action"><BpTh><span className="inline-flex items-center">فعالیت<AdminColumnFilter path="/admin/audit-logs" ariaLabel="فیلتر نوع فعالیت" groups={[{ name: "action", label: "نوع فعالیت", value: action, options: [{ value: "", label: "همه فعالیت‌ها" }, ...actionOptions] }]} /></span></BpTh></AdminColumn>
              <AdminColumn id="kind"><BpTh>نوع</BpTh></AdminColumn>
              <AdminColumn id="entity"><BpTh>موجودیت</BpTh></AdminColumn>
              <AdminColumn id="time"><BpTh>زمان</BpTh></AdminColumn>
              <BpTh>جزئیات</BpTh>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const kind = auditActionKind(log.action);
              return (
                <tr key={log.id}>
                  <BpTd className="bp-muted">{(pagination.skip + index + 1).toLocaleString("fa-IR")}</BpTd>
                  <AdminColumn id="actor">
                    <BpTd className="max-w-[220px]">
                      <div className="min-w-0">
                        <div className="truncate font-bold" title={auditActorName(log.actor)}>{auditActorName(log.actor)}</div>
                        <div dir="ltr" className="bp-muted truncate text-[11px]" title={log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"}>{log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"}</div>
                      </div>
                    </BpTd>
                  </AdminColumn>
                  <AdminColumn id="action"><BpTd className="max-w-[240px] truncate font-bold" title={auditActionLabel(log.action)}>{auditActionLabel(log.action)}</BpTd></AdminColumn>
                  <AdminColumn id="kind"><BpTd><AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge></BpTd></AdminColumn>
                  <AdminColumn id="entity">
                    <BpTd className="max-w-[200px]">
                      <div className="min-w-0">
                        <strong className="block text-[12px]">{auditEntityLabel(log.entityType)}</strong>
                        <div dir="ltr" className="bp-muted truncate font-mono text-[10px]" title={log.entityId ?? "بدون شناسه"}>{log.entityId ?? "بدون شناسه"}</div>
                      </div>
                    </BpTd>
                  </AdminColumn>
                  <AdminColumn id="time"><BpTd className="bp-muted whitespace-nowrap text-[12px]">{formatDateTime(log.createdAt)}</BpTd></AdminColumn>
                  <BpTd><DetailLink id={log.id} label={auditActionLabel(log.action)} /></BpTd>
                </tr>
              );
            })}
          </tbody>
        </BpTable>
      </div>
      <AdminPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.totalItems} totalPages={pagination.totalPages} />
    </AdminColumnVisibility>
  );
}
