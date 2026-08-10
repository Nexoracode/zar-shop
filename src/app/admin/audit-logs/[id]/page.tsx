import { notFound } from "next/navigation";
import { Activity, Clock3, Fingerprint, GitCompareArrows, Globe2, PackageSearch, UserRound } from "lucide-react";
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
  const log = await db.auditLog.findUnique({ where: { id }, include: { actor: { select: { firstName: true, lastName: true, phone: true, role: true } } } });
  if (!log) notFound();
  const kind = auditActionKind(log.action);
  const metadata = sanitizeAuditMetadata(log.metadata);
  const metadataRecord = isRecord(metadata) ? metadata : null;
  const requestDetails = metadataRecord && isRecord(metadataRecord.request) ? metadataRecord.request : null;

  return <>
    <AdminPageHeader eyebrow="جزئیات رویداد" title={auditActionLabel(log.action)} description="اطلاعات کامل عامل، زمان، موجودیت هدف و داده‌های همراه این فعالیت." backHref="/admin/audit-logs" backLabel="بازگشت به تاریخچه فعالیت‌ها" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-5">
        <AdminPanel className="p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#172b4d]"><Activity size={20} /></span><span><small className="block text-slate-400">عملیات انجام‌شده</small><strong className="mt-1 block text-base text-[#17233b]">{auditActionLabel(log.action)}</strong></span></span><AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge></div><dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2"><DetailItem label="کد فنی عملیات" value={log.action} ltr /><DetailItem label="نوع موجودیت" value={auditEntityLabel(log.entityType)} /><DetailItem label="شناسه موجودیت" value={log.entityId ?? "ثبت نشده"} ltr /><DetailItem label="شناسه رویداد" value={log.id} ltr /></dl></AdminPanel>
        <AuditMetadataPanel metadata={metadata} />
      </div>
      <aside className="grid content-start gap-5">
        <AdminPanel className="p-5">
          <div className="mb-4 flex items-center gap-2"><UserRound size={18} className="text-[#b5904c]" /><h2 className="m-0 text-sm font-black text-[#17233b]">کاربر پنل</h2></div>
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
            <strong className="block text-sm text-slate-700">{auditActorName(log.actor)}</strong>
            <small dir="ltr" className="mt-1 block text-right text-[11px] text-slate-400">{log.actor ? log.actor.phone ?? "شماره همراه ثبت نشده" : "رویداد خودکار سیستم"}</small>
          </div>
          <dl className="grid gap-3"><DetailItem label="شناسه کاربر" value={log.actorId ?? "رویداد خودکار سیستم"} ltr /><DetailItem label="نقش هنگام مشاهده" value={log.actor?.role ?? "SYSTEM"} ltr /></dl>
        </AdminPanel>
        <AdminPanel className="p-5"><div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-[#b5904c]" /><h2 className="m-0 text-sm font-black text-[#17233b]">زمان و مبدأ</h2></div><dl className="grid gap-3"><DetailItem label="زمان ثبت" value={formatDateTime(log.createdAt)} /><DetailItem label="نشانی IP" value={log.ipAddress ?? "ثبت نشده"} ltr />{requestDetails && <><DetailItem label="متد درخواست" value={displayValue(requestDetails.method)} ltr /><DetailItem label="مسیر درخواست" value={displayValue(requestDetails.path)} ltr /><DetailItem label="صفحه مبدأ" value={displayValue(requestDetails.referer)} ltr /><DetailItem label="مرورگر / دستگاه" value={displayValue(requestDetails.userAgent)} ltr /></>}</dl><div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/70 p-3 text-xs leading-6 text-blue-700"><Globe2 size={16} className="mt-1 shrink-0" /><span>اطلاعات مبدأ بر اساس داده ثبت‌شده هنگام انجام عملیات نمایش داده می‌شود.</span></div></AdminPanel>
      </aside>
    </div>
  </>;
}

type AuditChangeView = { path: string; label: string; before: unknown; after: unknown };

function AuditMetadataPanel({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return <AdminPanel className="p-5 sm:p-6"><EmptyMetadata /></AdminPanel>;
  }
  const details = metadata as Record<string, unknown>;
  const subject = isRecord(details.subject) ? details.subject : null;
  const changes = Array.isArray(details.changes) ? details.changes.filter(isAuditChange) : [];
  const extraEntries = Object.entries(details).filter(([key]) => !["subject", "summary", "changes", "before", "after", "request"].includes(key));

  return <AdminPanel className="p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-2"><Fingerprint size={18} className="text-[#b5904c]" /><h2 className="m-0 text-base font-black text-[#17233b]">شرح کامل فعالیت</h2></div>
    {typeof details.summary === "string" && <p className="mb-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm font-bold leading-7 text-[#694f1d]">{details.summary}</p>}
    {subject && <div className="mb-5 rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#17233b]"><PackageSearch size={17} className="text-[#b5904c]" />آیتم هدف</div><dl className="grid gap-3 sm:grid-cols-2"><DetailItem label="عنوان" value={displayValue(subject.name)} /><DetailItem label="شناسه آیتم" value={displayValue(subject.id)} ltr /><DetailItem label="کد محصول" value={displayValue(subject.sku)} ltr /><DetailItem label="نوع آیتم" value={displayValue(subject.type)} ltr /></dl></div>}
    {changes.length > 0 && <div><div className="mb-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-black text-[#17233b]"><GitCompareArrows size={17} className="text-[#b5904c]" />تغییرات دقیق</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">{changes.length.toLocaleString("fa-IR")} تغییر</span></div><div className="grid gap-3">{changes.map((change, index) => <ChangeCard key={`${change.path}-${index}`} change={change} />)}</div></div>}
    {changes.length === 0 && extraEntries.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{extraEntries.map(([key, value]) => <MetadataItem key={key} label={metadataLabel(key)} value={value} />)}</div>}
    {changes.length === 0 && extraEntries.length === 0 && !subject && typeof details.summary !== "string" && <EmptyMetadata />}
  </AdminPanel>;
}

function ChangeCard({ change }: { change: AuditChangeView }) {
  return <article className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3"><strong className="block text-sm text-slate-700">{change.label || change.path}</strong><small dir="ltr" className="mt-1 block text-left font-mono text-[10px] text-slate-400">{change.path}</small></div><div className="grid sm:grid-cols-2"><ChangeValue label="مقدار قبلی" value={change.before} tone="before" /><ChangeValue label="مقدار جدید" value={change.after} tone="after" /></div></article>;
}

function ChangeValue({ label, value, tone }: { label: string; value: unknown; tone: "before" | "after" }) {
  return <div className={`min-w-0 p-4 ${tone === "after" ? "bg-emerald-50/40" : "bg-rose-50/30 sm:border-l sm:border-slate-100"}`}><span className={`text-[11px] font-bold ${tone === "after" ? "text-emerald-700" : "text-rose-600"}`}>{label}</span><ValueBlock value={value} /></div>;
}

function MetadataItem({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 p-4"><span className="text-[11px] font-bold text-slate-400">{label}</span><ValueBlock value={value} /></div>;
}

function ValueBlock({ value }: { value: unknown }) {
  const complex = value !== null && typeof value === "object";
  return <div dir={complex ? "ltr" : "rtl"} className={`mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 ${complex ? "text-left font-mono text-xs" : "font-bold"}`}>{displayValue(value)}</div>;
}

function EmptyMetadata() {
  return <p className="m-0 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm leading-7 text-slate-500">این رویداد قدیمی است و پیش از فعال‌شدن ثبت جزئیات کامل ایجاد شده؛ مقدار قبل و بعد برای آن در دیتابیس موجود نیست.</p>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAuditChange(value: unknown): value is AuditChangeView {
  return isRecord(value) && typeof value.path === "string" && typeof value.label === "string" && "before" in value && "after" in value;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "ثبت نشده";
  if (value === true) return "بله";
  if (value === false) return "خیر";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function metadataLabel(key: string) {
  const labels: Record<string, string> = { name: "نام", sku: "کد محصول", status: "وضعیت", categoryId: "شناسه دسته‌بندی", changedFields: "فیلدهای تغییرکرده", previousRole: "نقش قبلی", nextRole: "نقش جدید", provider: "ارائه‌دهنده", title: "عنوان", code: "کد", scope: "محدوده", requestedIds: "شناسه‌های درخواستی", updated: "تعداد به‌روزرسانی" };
  return labels[key] ?? key;
}

function DetailItem({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0"><dt className="text-[11px] font-bold text-slate-400">{label}</dt><dd dir={ltr ? "ltr" : "rtl"} className={`mb-0 mt-1 break-all text-sm font-bold text-slate-700 ${ltr ? "text-left font-mono text-xs" : ""}`}>{value}</dd></div>;
}
