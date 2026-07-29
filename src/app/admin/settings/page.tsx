import { AdminSettings } from "@/components/admin-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  return (
    <>
      <AdminPageHeader eyebrow="تنظیمات پنل" title="تنظیمات" description="ظاهر و ترجیحات رابط مدیریت را برای تجربه کاری خود تنظیم کنید." />
      <AdminSettings />
    </>
  );
}
