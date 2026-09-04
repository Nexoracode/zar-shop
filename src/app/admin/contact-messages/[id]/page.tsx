import { notFound, redirect } from "next/navigation";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { BlueprintContactMessageDetailView } from "@/components/admin/blueprint/contact-message-detail-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export default async function AdminContactMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const [message, brandSettings] = await Promise.all([
    db.contactMessage.findUnique({ where: { id } }),
    getBrandSettings(),
  ]);
  if (!message) notFound();
  // The detail page is Blueprint-only for now; a Classic store falls back to the list, which
  // already shows the full message inline and can resolve/unresolve it from there.
  if (brandSettings.adminTemplate !== "BLUEPRINT") redirect("/admin/contact-messages");

  return <>
    <AdminPageHeader
      eyebrow="ارتباط با فروشگاه"
      title={message.subject}
      description={`پیام ارسالی ${message.name}`}
      backHref="/admin/contact-messages"
      backLabel="بازگشت به پیام‌های تماس"
      action={<AdminStatusBadge tone={message.isResolved ? "success" : "warning"}>{message.isResolved ? "بررسی‌شده" : "بررسی‌نشده"}</AdminStatusBadge>}
    />
    <BlueprintContactMessageDetailView message={message} />
  </>;
}
