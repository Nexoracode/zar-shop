import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintCommunicationSettingsForm } from "@/components/admin/blueprint/communication-settings-form";
import { requirePermission } from "@/modules/auth/session";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "تنظیمات پیامک و اعلان" };
export default async function CommunicationPreferencesPage() {
  await requirePermission("settings:manage");
  const settings = await getCommunicationSettings();
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="تنظیمات پیامک و اعلان" description="کانال‌ها، رویدادها و متن پیام‌های سیستمی را مشخص کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" />
    <BlueprintCommunicationSettingsForm initialSettings={settings} />
  </>;
}
