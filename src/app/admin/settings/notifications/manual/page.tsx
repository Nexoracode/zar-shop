import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { ManualSmsForm } from "@/components/manual-sms-form";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "ارسال دستی پیامک" };
export default async function ManualSmsPage() { await requireAdminUser(); const campaigns = await db.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 }); return <><AdminPageHeader eyebrow="پیامک و اعلان" title="ارسال دستی پیامک" description="مخاطبان هدف را انتخاب کنید و پیامک اطلاع‌رسانی ارسال کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" /><ManualSmsForm initialCampaigns={campaigns.map((item) => ({ id: item.id, audience: item.audience, message: item.message, recipientCount: item.recipientCount, successfulCount: item.successfulCount, failedCount: item.failedCount, status: item.status, createdAt: item.createdAt.toISOString() }))} /></>; }
