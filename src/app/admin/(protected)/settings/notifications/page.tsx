import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintCommunicationsNavigation } from "@/components/admin/blueprint/communications-navigation";
import { SmsSetupStatus } from "@/components/admin/blueprint/sms-setup-status";
import { requirePermission } from "@/modules/auth/session";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "پیامک و اعلان" };
export default async function NotificationsPage() {
  await requirePermission("settings:manage");
  const [configs, settings] = await Promise.all([getPublicSmsProviderConfigs(), getCommunicationSettings()]);
  return <>
    <AdminPageHeader eyebrow="تنظیمات سایت" title="پیامک و اعلان" description="ارائه‌دهندگان، پیام‌های خودکار و ارسال‌های دستی فروشگاه را مدیریت کنید." backHref="/admin/settings" backLabel="بازگشت به تنظیمات" />
    <SmsSetupStatus config={configs.find((config) => config.provider === "FARAZ_SMS") ?? null} smsEnabled={settings.smsEnabled} />
    <BlueprintCommunicationsNavigation />
  </>;
}
