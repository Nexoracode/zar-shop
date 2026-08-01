import { AdminPageHeader } from "@/components/admin-ui";
import { AdminSettingsNavigation } from "@/components/admin-settings-navigation";
import { requireAdminUser } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const industry = await getStoreIndustry();

  return <>
    <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="بخش موردنظر را انتخاب کنید تا تنظیمات آن را در صفحه‌ای مستقل مدیریت کنید." />
    <AdminSettingsNavigation industry={industry} />
  </>;
}
