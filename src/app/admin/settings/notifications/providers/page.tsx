import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { SmsProviderManager } from "@/components/sms-provider-manager";
import { requirePermission } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";

export const metadata: Metadata = { title: "ارائه‌دهندگان پیامک" };
export default async function SmsProvidersPage() { await requirePermission("settings:manage"); const configs = await getPublicSmsProviderConfigs(); return <><AdminPageHeader eyebrow="پیامک و اعلان" title="ارائه‌دهندگان پیامک" description="اطلاعات اتصال و ارائه‌دهنده فعال ارسال را مدیریت کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" action={<AdminPrimaryLink href="/admin/settings/notifications/providers/new"><Plus size={17} />افزودن ارائه‌دهنده</AdminPrimaryLink>} /><SmsProviderManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} /></>; }
