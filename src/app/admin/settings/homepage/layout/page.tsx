import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepageLayoutSettings } from "@/components/homepage-layout-settings";
import { requirePermission } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت چینش صفحه اصلی" };

export default async function HomepageLayoutSettingsPage() {
  await requirePermission("settings:manage");
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت چینش" description="ترتیب تمام بخش‌ها و ردیف‌های تایل را با پیش‌نمایش زنده دسکتاپ و موبایل تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <HomepageLayoutSettings initialSettings={await getHomepageSettings()} />
  </>;
}
