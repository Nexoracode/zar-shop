import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepageHeroSettings } from "@/components/homepage-hero-settings";
import { requireAdminUser } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت هیرو صفحه اصلی" };

export default async function HomepageHeroSettingsPage() {
  await requireAdminUser();
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت هیرو" description="محتوا، تصاویر واکنش‌گرا، ترتیب اسلایدها و لینک اختصاصی هر تصویر را مدیریت کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <HomepageHeroSettings initialSettings={await getHomepageSettings()} />
  </>;
}
