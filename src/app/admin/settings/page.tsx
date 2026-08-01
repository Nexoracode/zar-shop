import { AdminSettings } from "@/components/admin-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const [settings, homepageSettings] = await Promise.all([getGeneralStoreSettings(), getHomepageSettings()]);
  return (
    <>
      <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="ساختار، محتوای عمومی و قواعد عملیاتی فروشگاه را در یک محل مدیریت کنید." />
      <AdminSettings initialSettings={settings} initialHomepageSettings={homepageSettings} />
    </>
  );
}
