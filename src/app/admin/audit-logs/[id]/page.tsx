import { notFound } from "next/navigation";
import { Activity, Clock3, Fingerprint, Globe2, UserRound } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { auditActionKind, auditActionLabel, auditActorName, auditEntityLabel, sanitizeAuditMetadata } from "@/modules/audit/audit-log";
import { requirePermission } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };
const kindLabels = { CREATE: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف", ACCESS: "دسترسی", SYSTEM: "سیستمی" } as const;
const kindTones = { CREATE: "success", UPDATE: "info", DELETE: "danger", ACCESS: "gold", SYSTEM: "neutral" } as const;

export default async function AuditLogDetailPage({ params }: Context) {
  await requirePermission("audit:view");
  const { id } = await params;
  const log = await db.auditLog.findUnique({ where: { id }, include: { actor: { select: { firstName: true, lastName: true, email: true, phone: true, role: true } } } });
  if (!log) notFound();
  const kind = auditActionKind(log.action);
  const metadata = sanitizeAuditMetadata(log.metadata);

  return <>
    <AdminPageHeader eyebrow="جزئیات رویداد" title={auditActionLabel(log.action)} description="اطلاعات کامل عامل، زمان، موجودیت هدف و داده‌های همراه این فعالیت." backHref="/admin/audit-logs" backLabel="بازگشت به تاریخچه فعالیت‌ها" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-5">
        <AdminPanel className="p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#172b4d]"><Activity size={20} /></span><span><small className="block text-slate-400">عملیات انجام‌شده</small><strong className="mt-1 block text-base text-[#17233b]">{auditActionLabel(log.action)}</strong></span></span><AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge></div><dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2"><DetailItem label="کد فنی عملیات" value={log.action} ltr /><DetailItem label="نوع موجودیت" value={auditEntityLabel(log.entityType)} /><DetailItem label="شناسه موجودیت" value={log.entityId ?? "ثبت نشده"} ltr /><DetailItem label="شناسه رویداد" value={log.id} ltr /></dl></AdminPanel>
        <AdminPanel className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><Fingerprint size={18} className="text-[#b5904c]" /><h2 className="m-0 text-base font-black text-[#17233b]">جزئیات ثبت‌شده</h2></div>{metadata === null || metadata === undefined ? <p className="m-0 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">اطلاعات تکمیلی برای این رویداد ثبت نشده است.</p> : <pre dir="ltr" className="m-0 max-h-[520px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[#101827] p-4 text-left font-mono text-xs leading-7 text-slate-200">{JSON.stringify(metadata, null, 2)}</pre>}</AdminPanel>
      </div>
      <aside className="grid content-start gap-5">
        <AdminPanel className="p-5"><div className="mb-4 flex items-center gap-2"><UserRound size={18} className="text-[#b5904c]" /><h2 className="m-0 text-sm font-black text-[#17233b]">کاربر پنل</h2></div><dl className="grid gap-3"><DetailItem label="نام" value={auditActorName(log.actor)} /><DetailItem label="ایمیل" value={log.actor?.email ?? "رویداد خودکار سیستم"} ltr /><DetailItem label="شماره همراه" value={log.actor?.phone ?? "ثبت نشده"} ltr /><DetailItem label="نقش هنگام مشاهده" value={log.actor?.role ?? "SYSTEM"} ltr /></dl></AdminPanel>
        <AdminPanel className="p-5"><div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-[#b5904c]" /><h2 className="m-0 text-sm font-black text-[#17233b]">زمان و مبدأ</h2></div><dl className="grid gap-3"><DetailItem label="زمان ثبت" value={formatDateTime(log.createdAt)} /><DetailItem label="نشانی IP" value={log.ipAddress ?? "ثبت نشده"} ltr /></dl><div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/70 p-3 text-xs leading-6 text-blue-700"><Globe2 size={16} className="mt-1 shrink-0" /><span>IP فقط زمانی نمایش داده می‌شود که Route عملیاتی آن را ثبت کرده باشد.</span></div></AdminPanel>
      </aside>
    </div>
  </>;
}

function DetailItem({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0"><dt className="text-[11px] font-bold text-slate-400">{label}</dt><dd dir={ltr ? "ltr" : "rtl"} className={`mb-0 mt-1 break-all text-sm font-bold text-slate-700 ${ltr ? "text-left font-mono text-xs" : ""}`}>{value}</dd></div>;
}
