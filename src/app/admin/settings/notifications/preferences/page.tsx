import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { CommunicationSettingsForm } from "@/components/communication-settings-form";
import { BlueprintCommunicationSettingsForm } from "@/components/admin/blueprint/communication-settings-form";
import { requirePermission } from "@/modules/auth/session";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export const metadata: Metadata = { title: "تنظیمات پیامک و اعلان" };
export default async function CommunicationPreferencesPage() {
  await requirePermission("settings:manage");
  const [settings, brandSettings] = await Promise.all([getCommunicationSettings(), getBrandSettings()]);
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="تنظیمات پیامک و اعلان" description="کانال‌ها، رویدادها و متن پیام‌های سیستمی را مشخص کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" />
    {brandSettings.adminTemplate === "BLUEPRINT" ? <BlueprintCommunicationSettingsForm initialSettings={settings} /> : <CommunicationSettingsForm initialSettings={settings} />}
  </>;
}
