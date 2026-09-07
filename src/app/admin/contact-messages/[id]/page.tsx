import { notFound } from "next/navigation";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { BlueprintContactMessageDetailView } from "@/components/admin/blueprint/contact-message-detail-view";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

export default async function AdminContactMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) notFound();

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
