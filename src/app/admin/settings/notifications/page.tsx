import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { CommunicationsNavigation } from "@/components/communications-navigation";
import { BlueprintCommunicationsNavigation } from "@/components/admin/blueprint/communications-navigation";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export const metadata: Metadata = { title: "پیامک و اعلان" };
export default async function NotificationsPage() {
  await requirePermission("settings:manage");
  const brandSettings = await getBrandSettings();
  return <>
    <AdminPageHeader eyebrow="تنظیمات سایت" title="پیامک و اعلان" description="ارائه‌دهندگان، پیام‌های خودکار و ارسال‌های دستی فروشگاه را مدیریت کنید." backHref="/admin/settings" backLabel="بازگشت به تنظیمات" />
    {brandSettings.adminTemplate === "BLUEPRINT" ? <BlueprintCommunicationsNavigation /> : <CommunicationsNavigation />}
  </>;
}
