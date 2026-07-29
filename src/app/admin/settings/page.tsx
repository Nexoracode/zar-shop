import { AdminSettings } from "@/components/admin-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const storeIndustry = await getStoreIndustry();
  return (
    <>
      <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="ساختار، محتوای عمومی و قواعد عملیاتی فروشگاه را در یک محل مدیریت کنید." />
      <AdminSettings initialIndustry={storeIndustry} />
    </>
  );
}
