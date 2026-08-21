import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepageMenuSettings } from "@/components/homepage-menu-settings";
import { requirePermission } from "@/modules/auth/session";
import { getHomepageMenuLinkOptions, getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت منوی بالای سایت" };

export default async function HomepageMenuSettingsPage() {
  await requirePermission("settings:manage");
  const [settings, linkOptions] = await Promise.all([getHomepageSettings(), getHomepageMenuLinkOptions()]);
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت منوی بالای سایت" description="آیتم‌های مستقل، لینک‌ها و ترتیب نمایش منوی هدر را تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <HomepageMenuSettings initialSettings={settings} linkOptions={linkOptions} />
  </>;
}
