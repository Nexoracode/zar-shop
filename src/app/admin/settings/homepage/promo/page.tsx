import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepagePromoSettings } from "@/components/homepage-promo-settings";
import { requireAdminUser } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت پروموبنر" };

export default async function HomepagePromoSettingsPage() {
  await requireAdminUser();
  const settings = await getHomepageSettings();
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت پروموبنر" description="وضعیت نمایش، لینک مقصد و تصاویر دسکتاپ و موبایل بنر بالای سایت را تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <HomepagePromoSettings initialSettings={settings} />
  </>;
}
