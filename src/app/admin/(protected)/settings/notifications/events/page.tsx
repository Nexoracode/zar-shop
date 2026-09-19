import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsEventsForm } from "@/components/admin/blueprint/sms-events-form";
import { requirePermission } from "@/modules/auth/session";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "پیامک‌های رویدادها" };
export default async function SmsEventsPage() {
  await requirePermission("settings:manage");
  const [settings, configs, general] = await Promise.all([getCommunicationSettings(), getPublicSmsProviderConfigs(), getGeneralStoreSettings()]);
  // Patterns are read from the *active* Faraz account, so choosing one needs that provider switched on.
  const providerReady = configs.some((config) => config.provider === "FARAZ_SMS" && config.isActive);
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="پیامک‌های رویدادها" description="برای هر مرحله‌ی سفارش مشخص کنید پیامک ارسال شود یا نه، و با کدام پترن یا متن." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" />
    <BlueprintSmsEventsForm initialSettings={settings} storeName={general.storeName} providerReady={providerReady} />
  </>;
}
