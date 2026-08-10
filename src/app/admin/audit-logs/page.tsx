import type { Prisma } from "@generated/prisma/client";
import Link from "next/link";
import { Eye, History } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminListFilters } from "@/components/admin-list-filters";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminTableRefreshButton } from "@/components/admin-table-refresh";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { resolveAdminPagination } from "@/lib/admin-pagination";
import { parseAdminPaginationRequest } from "@/lib/admin-pagination-server";
import { auditActionKind, auditActionLabel, auditActorName, auditEntityLabel } from "@/modules/audit/audit-log";
import { requirePermission } from "@/modules/auth/session";

type AuditRow = Prisma.AuditLogGetPayload<{ include: { actor: { select: { firstName: true; lastName: true; phone: true; role: true } } } }>;
type SearchParams = Promise<{ q?: string; action?: string; page?: string; pageSize?: string }>;

const kindLabels = { CREATE: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف", ACCESS: "دسترسی", SYSTEM: "سیستمی" } as const;
const kindTones = { CREATE: "success", UPDATE: "info", DELETE: "danger", ACCESS: "gold", SYSTEM: "neutral" } as const;

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
  const cell = "border-b border-slate-100 px-5 py-3.5 align-middle text-sm text-slate-600";

  return <>
    <AdminPageHeader eyebrow="نظارت و امنیت" title="تاریخچه فعالیت‌ها" description="تمام عملیات ثبت، ویرایش، حذف و دسترسی کاربران پنل را با جزئیات بررسی کنید." action={<AdminTableRefreshButton />} />
    <AdminPanel className="mb-5 p-4 sm:p-5"><AdminListFilters path="/admin/audit-logs" query={query} queryLabel="جست‌وجوی فعالیت" queryPlaceholder="نام مدیر، عملیات، موجودیت یا شناسه" filters={[{ name: "action", label: "نوع فعالیت", value: action, options: [{ value: "", label: "همه فعالیت‌ها" }, ...actionRows.map((item) => ({ value: item.action, label: auditActionLabel(item.action) }))] }]} /></AdminPanel>
    <AdminPanel>
      {!logs.length ? <AdminEmptyState title="فعالیتی پیدا نشد" description={query || action ? "فیلترها را تغییر دهید و دوباره جست‌وجو کنید." : "هنوز فعالیت مدیریتی ثبت نشده است."} /> : <>
        <div className="divide-y divide-slate-100 md:hidden">{logs.map((log) => <AuditMobileCard key={log.id} log={log} />)}</div>
        <Table className="hidden md:block"><TableScrollContainer><TableContent aria-label="تاریخچه فعالیت کاربران پنل" className="w-full min-w-[920px]"><TableHeader>{["ردیف", "کاربر پنل", "فعالیت", "نوع", "موجودیت", "زمان", "جزئیات"].map((head, index) => <TableColumn id={head} key={head} isRowHeader={index === 2} className="bg-slate-50/70 px-5 py-3.5 text-right text-xs font-bold text-slate-500">{head}</TableColumn>)}</TableHeader><TableBody>{logs.map((log: AuditRow, index) => {
          const kind = auditActionKind(log.action);
          return <TableRow id={log.id} key={log.id} className="transition hover:bg-slate-50/60">
            <TableCell className={`${cell} w-16 font-bold text-slate-400`}>{(pagination.skip + index + 1).toLocaleString("fa-IR")}</TableCell>
            <TableCell className={`${cell} w-56 max-w-56`}><div className="min-w-0"><TruncatedTextTooltip text={auditActorName(log.actor)} className="max-w-48 font-bold text-slate-700" /><TruncatedTextTooltip text={log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"} dir="ltr" className="max-w-48 text-right text-[11px] text-slate-400" /></div></TableCell>
            <TableCell className={`${cell} w-60 max-w-60`}><TruncatedTextTooltip text={auditActionLabel(log.action)} className="max-w-52 font-bold text-[#17233b]" /></TableCell>
            <TableCell className={cell}><AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge></TableCell>
            <TableCell className={`${cell} w-52 max-w-52`}><strong className="block text-xs text-slate-700">{auditEntityLabel(log.entityType)}</strong><TruncatedTextTooltip text={log.entityId ?? "بدون شناسه"} dir="ltr" className="mt-1 max-w-44 text-right font-mono text-[10px] text-slate-400" /></TableCell>
            <TableCell className={`${cell} whitespace-nowrap text-xs`}>{formatDateTime(log.createdAt)}</TableCell>
            <TableCell className={cell}><DetailLink id={log.id} label={auditActionLabel(log.action)} /></TableCell>
          </TableRow>;
        })}</TableBody></TableContent></TableScrollContainer></Table>
        <AdminPagination {...pagination} />
      </>}
    </AdminPanel>
  </>;
}

function DetailLink({ id, label }: { id: string; label: string }) {
  return <Link href={`/admin/audit-logs/${id}`} aria-label={`مشاهده جزئیات ${label}`} title="مشاهده جزئیات" className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#172b4d] transition hover:border-[#b5904c] hover:text-[#846325]"><Eye size={15} /></Link>;
}

function AuditMobileCard({ log }: { log: AuditRow }) {
  const kind = auditActionKind(log.action);
  return <article className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><History size={17} /></span><span className="min-w-0"><strong className="block truncate text-sm text-[#17233b]">{auditActorName(log.actor)}</strong><small dir="ltr" className="block truncate text-right text-slate-400">{log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"}</small></span></span><AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge></div><div className="flex items-end justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><span className="block text-xs font-bold text-slate-600">{auditActionLabel(log.action)} · {auditEntityLabel(log.entityType)}</span><small className="mt-1 block text-slate-400">{formatDateTime(log.createdAt)}</small></div><DetailLink id={log.id} label={auditActionLabel(log.action)} /></div></article>;
}
