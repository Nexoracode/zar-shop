import type { Metadata } from "next";
import { MessageSquarePlus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintSmsCampaignList } from "@/components/admin/blueprint/manual-sms-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "تاریخچه ارسال پیامک" };
export default async function ManualSmsPage() {
  await requirePermission("settings:manage");
  const campaigns = await db.smsCampaign.findMany({ where: { actorId: { not: null } }, orderBy: { createdAt: "desc" }, take: 50 });
  const items = campaigns.map((item) => ({ id: item.id, audience: item.audience, message: item.message, recipientCount: item.recipientCount, successfulCount: item.successfulCount, failedCount: item.failedCount, status: item.status, createdAt: item.createdAt.toISOString() }));
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="ارسال‌های دستی" description="تاریخچه، تعداد مخاطبان و نتیجه پیامک‌های ارسال‌شده را بررسی کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" action={<AdminPrimaryLink href="/admin/settings/notifications/manual/new"><MessageSquarePlus size={17} />ارسال پیامک</AdminPrimaryLink>} />
    <BlueprintSmsCampaignList key={items.map((item) => `${item.id}:${item.status}:${item.successfulCount}:${item.failedCount}`).join("|")} items={items} />
  </>;
}
