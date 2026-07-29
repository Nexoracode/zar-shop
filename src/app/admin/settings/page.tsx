import { AdminSettings } from "@/components/admin-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  return (
    <>
      <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="ساختار، محتوای عمومی و قواعد عملیاتی فروشگاه را در یک محل مدیریت کنید." />
      <AdminSettings />
    </>
  );
}
