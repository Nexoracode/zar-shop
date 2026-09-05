import { AdminPageHeader } from "@/components/admin-ui";
import { AdminSettingsNavigation } from "@/components/admin-settings-navigation";
import { BlueprintAdminSettingsNavigation } from "@/components/admin/blueprint/settings-navigation";
import { adminStartPath, canOpenAnySettingsSection } from "@/modules/auth/permissions";
import { requireAdminUser } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { redirect } from "next/navigation";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  if (!canOpenAnySettingsSection(user.role)) redirect(adminStartPath(user.role));
  const [industry, brandSettings] = await Promise.all([getStoreIndustry(), getBrandSettings()]);

  return <>
    <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="بخش موردنظر را انتخاب کنید تا تنظیمات آن را در صفحه‌ای مستقل مدیریت کنید." />
    {brandSettings.adminTemplate === "BLUEPRINT"
      ? <BlueprintAdminSettingsNavigation industry={industry} role={user.role} />
      : <AdminSettingsNavigation industry={industry} role={user.role} />}
  </>;
}
