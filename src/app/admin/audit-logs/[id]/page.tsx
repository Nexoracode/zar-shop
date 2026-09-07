import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { db } from "@/lib/db";
import { auditActionLabel } from "@/modules/audit/audit-log";
import { requirePermission } from "@/modules/auth/session";
import { BlueprintAuditLogDetailView } from "@/components/admin/blueprint/audit-log-detail-view";

type Context = { params: Promise<{ id: string }> };

export default async function AuditLogDetailPage({ params }: Context) {
  await requirePermission("audit:view");
  const { id } = await params;
  const log = await db.auditLog.findUnique({ where: { id }, include: { actor: { select: { firstName: true, lastName: true, phone: true, role: true } } } });
  if (!log) notFound();
  return <>
    <AdminPageHeader eyebrow="جزئیات رویداد" title={auditActionLabel(log.action)} description="اطلاعات کامل عامل، زمان، موجودیت هدف و داده‌های همراه این فعالیت." backHref="/admin/audit-logs" backLabel="بازگشت به تاریخچه فعالیت‌ها" />
    <BlueprintAuditLogDetailView log={log} />
  </>;
}
