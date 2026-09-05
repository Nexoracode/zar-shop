import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepageLayoutSettings } from "@/components/homepage-layout-settings";
import { BlueprintHomepageLayoutSettings } from "@/components/admin/blueprint/homepage-layout-settings";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت چینش صفحه اصلی" };

export default async function HomepageLayoutSettingsPage() {
  await requirePermission("settings:manage");
  const [settings, brandSettings] = await Promise.all([getHomepageSettings(), getBrandSettings()]);
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت چینش" description="ترتیب تمام بخش‌ها و ردیف‌های تایل را با پیش‌نمایش زنده دسکتاپ و موبایل تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    {brandSettings.adminTemplate === "BLUEPRINT" ? <BlueprintHomepageLayoutSettings initialSettings={settings} /> : <HomepageLayoutSettings initialSettings={settings} />}
  </>;
}
