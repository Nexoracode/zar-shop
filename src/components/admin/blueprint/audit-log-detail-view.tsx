import { Activity, Clock3, Fingerprint, GitCompareArrows, Globe2, PackageSearch, UserRound } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { formatDateTime } from "@/lib/format";
import { auditActionKind, auditActionLabel, auditActorName, auditEntityLabel, sanitizeAuditMetadata } from "@/modules/audit/audit-log";
import { BpKicker, BpTag } from "./ui";

const kindLabels = { CREATE: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف", ACCESS: "دسترسی", SYSTEM: "سیستمی" } as const;
const kindTones = { CREATE: "success", UPDATE: "info", DELETE: "danger", ACCESS: "gold", SYSTEM: "neutral" } as const;

type AuditLogDetail = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  ipAddress: string | null;
  createdAt: Date;
  metadata: unknown;
  actor: { firstName: string | null; lastName: string | null; phone: string | null; role: string } | null;
};

type AuditChangeView = { path: string; label: string; before: unknown; after: unknown };

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
  return (
    <div className="min-w-0">
      <span className="bp-muted block text-[11px] font-bold">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className={`mt-1 block break-all text-[13px] font-bold ${ltr ? "text-left font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

function ValueBlock({ value }: { value: unknown }) {
  const complex = value !== null && typeof value === "object";
  return <div dir={complex ? "ltr" : "rtl"} className={`mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[13px] leading-7 ${complex ? "text-left font-mono text-[11px]" : "font-bold"}`}>{displayValue(value)}</div>;
}

function MetadataItem({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3"><span className="bp-muted text-[11px] font-bold">{label}</span><ValueBlock value={value} /></div>;
}

function ChangeValue({ label, value, tone }: { label: string; value: unknown; tone: "before" | "after" }) {
  return (
    <div className={`min-w-0 p-3 ${tone === "after" ? "bg-[var(--bp-success-bg)]" : "bg-[var(--bp-danger-bg)] sm:border-e sm:border-[var(--bp-divider)]"}`}>
      <span className={`text-[11px] font-bold ${tone === "after" ? "text-[var(--bp-success)]" : "text-[var(--bp-danger)]"}`}>{label}</span>
      <ValueBlock value={value} />
    </div>
  );
}

function ChangeCard({ change }: { change: AuditChangeView }) {
  return (
    <article className="overflow-hidden border border-[var(--bp-divider)]">
      <div className="border-b border-[var(--bp-divider)] bg-[var(--bp-bg)] px-3 py-2.5">
        <strong className="block text-[13px]">{change.label || change.path}</strong>
        <span dir="ltr" className="bp-muted mt-1 block text-left font-mono text-[10px]">{change.path}</span>
      </div>
      <div className="grid sm:grid-cols-2">
        <ChangeValue label="مقدار قبلی" value={change.before} tone="before" />
        <ChangeValue label="مقدار جدید" value={change.after} tone="after" />
      </div>
    </article>
  );
}

function EmptyMetadata() {
  return <p className="bp-muted m-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] px-4 py-8 text-center text-[13px] leading-7">این رویداد قدیمی است و پیش از فعال‌شدن ثبت جزئیات کامل ایجاد شده؛ مقدار قبل و بعد برای آن در دیتابیس موجود نیست.</p>;
}

function AuditMetadataPanel({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return <section className="bp-frame relative p-[18px]"><EmptyMetadata /></section>;
  }
  const details = metadata as Record<string, unknown>;
  const subject = isRecord(details.subject) ? details.subject : null;
  const changes = Array.isArray(details.changes) ? details.changes.filter(isAuditChange) : [];
  const extraEntries = Object.entries(details).filter(([key]) => !["subject", "summary", "changes", "before", "after", "request"].includes(key));

  return (
    <section className="bp-frame relative p-[18px]">
      <div className="mb-4 flex items-center gap-2"><Fingerprint size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[14px] font-bold">شرح کامل فعالیت</h2></div>
      {typeof details.summary === "string" && <p className="mb-4 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[13px] font-bold leading-7 text-[var(--bp-warning)]">{details.summary}</p>}
      {subject && (
        <div className="mb-4 border border-[var(--bp-divider)] p-3">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-bold"><PackageSearch size={15} className="text-[var(--bp-accent)]" />آیتم هدف</div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="عنوان" value={displayValue(subject.name)} />
            <DetailItem label="شناسه آیتم" value={displayValue(subject.id)} ltr />
            {"sku" in subject && <DetailItem label="کد محصول" value={displayValue(subject.sku)} ltr />}
            {"slug" in subject && <DetailItem label="نشانی" value={displayValue(subject.slug)} ltr />}
            <DetailItem label="نوع آیتم" value={displayValue(subject.type)} ltr />
          </dl>
        </div>
      )}
      {changes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[13px] font-bold"><GitCompareArrows size={15} className="text-[var(--bp-accent)]" />تغییرات دقیق</span>
            <BpTag>{changes.length.toLocaleString("fa-IR")} تغییر</BpTag>
          </div>
          <div className="grid gap-3">{changes.map((change, index) => <ChangeCard key={`${change.path}-${index}`} change={change} />)}</div>
        </div>
      )}
      {changes.length === 0 && extraEntries.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{extraEntries.map(([key, value]) => <MetadataItem key={key} label={metadataLabel(key)} value={value} />)}</div>}
      {changes.length === 0 && extraEntries.length === 0 && !subject && typeof details.summary !== "string" && <EmptyMetadata />}
    </section>
  );
}

export function BlueprintAuditLogDetailView({ log }: { log: AuditLogDetail }) {
  const kind = auditActionKind(log.action);
  const metadata = sanitizeAuditMetadata(log.metadata);
  const metadataRecord = isRecord(metadata) ? metadata : null;
  const requestDetails = metadataRecord && isRecord(metadataRecord.request) ? metadataRecord.request : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-4">
        <section className="bp-frame relative p-[18px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="grid size-11 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><Activity size={19} /></span>
              <span><BpKicker>عملیات انجام‌شده</BpKicker><strong className="mt-1 block text-[14px]">{auditActionLabel(log.action)}</strong></span>
            </span>
            <AdminStatusBadge tone={kindTones[kind]}>{kindLabels[kind]}</AdminStatusBadge>
          </div>
          <dl className="grid gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 sm:grid-cols-2">
            <DetailItem label="کد فنی عملیات" value={log.action} ltr />
            <DetailItem label="نوع موجودیت" value={auditEntityLabel(log.entityType)} />
            <DetailItem label="شناسه موجودیت" value={log.entityId ?? "ثبت نشده"} ltr />
            <DetailItem label="شناسه رویداد" value={log.id} ltr />
          </dl>
        </section>
        <AuditMetadataPanel metadata={metadata} />
      </div>

      <aside className="grid content-start gap-4">
        <section className="bp-frame relative p-[18px]">
          <div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">کاربر پنل</h2></div>
          <dl className="grid gap-3">
            <DetailItem label="نام" value={auditActorName(log.actor)} />
            <DetailItem label="شماره همراه" value={log.actor?.phone ?? "ثبت نشده"} ltr />
            <DetailItem label="شناسه کاربر" value={log.actorId ?? "رویداد خودکار سیستم"} ltr />
            <DetailItem label="نقش هنگام مشاهده" value={log.actor?.role ?? "SYSTEM"} ltr />
          </dl>
        </section>
        <section className="bp-frame relative p-[18px]">
          <div className="mb-3 flex items-center gap-2"><Clock3 size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">زمان و مبدأ</h2></div>
          <dl className="grid gap-3">
            <DetailItem label="زمان ثبت" value={formatDateTime(log.createdAt)} />
            <DetailItem label="نشانی IP" value={log.ipAddress ?? "ثبت نشده"} ltr />
            {requestDetails && <>
              <DetailItem label="متد درخواست" value={displayValue(requestDetails.method)} ltr />
              <DetailItem label="مسیر درخواست" value={displayValue(requestDetails.path)} ltr />
              <DetailItem label="صفحه مبدأ" value={displayValue(requestDetails.referer)} ltr />
              <DetailItem label="مرورگر / دستگاه" value={displayValue(requestDetails.userAgent)} ltr />
            </>}
          </dl>
          <div className="mt-3 flex items-start gap-2 border border-[var(--bp-info)] bg-[var(--bp-info-bg)] p-3 text-[12px] leading-6 text-[var(--bp-info)]">
            <Globe2 size={15} className="mt-0.5 shrink-0" />
            <span>اطلاعات مبدأ بر اساس داده ثبت‌شده هنگام انجام عملیات نمایش داده می‌شود.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
