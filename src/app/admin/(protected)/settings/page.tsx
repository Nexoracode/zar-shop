import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintAdminSettingsNavigation } from "@/components/admin/blueprint/settings-navigation";
import { adminStartPath, canOpenAnySettingsSection } from "@/modules/auth/permissions";
import { requireAdminUser } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  if (!canOpenAnySettingsSection(user.role)) redirect(adminStartPath(user.role));
  const industry = await getStoreIndustry();

  return <>
    <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="بخش موردنظر را انتخاب کنید تا تنظیمات آن را در صفحه‌ای مستقل مدیریت کنید." />
    <BlueprintAdminSettingsNavigation industry={industry} role={user.role} />
  </>;
}
