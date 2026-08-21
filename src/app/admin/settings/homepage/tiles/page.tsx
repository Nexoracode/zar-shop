import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepageTileSettings } from "@/components/homepage-tile-settings";
import { requirePermission } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت تایل‌های صفحه اصلی" };

export default async function HomepageTileSettingsPage() {
  await requirePermission("settings:manage");
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت تایل‌ها" description="ردیف‌های تصویری، نوع چیدمان، تصاویر، لینک‌ها و ترتیب تایل‌های هر ردیف را مدیریت کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <HomepageTileSettings initialSettings={await getHomepageSettings()} />
  </>;
}
