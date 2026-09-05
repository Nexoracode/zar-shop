import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { HomepagePromoSettings } from "@/components/homepage-promo-settings";
import { BlueprintHomepagePromoSettings } from "@/components/admin/blueprint/homepage-promo-settings";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

export const metadata: Metadata = { title: "مدیریت پروموبنر" };

export default async function HomepagePromoSettingsPage() {
  await requirePermission("settings:manage");
  const [settings, brandSettings] = await Promise.all([getHomepageSettings(), getBrandSettings()]);
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت پروموبنر" description="وضعیت نمایش، لینک مقصد و تصاویر دسکتاپ و موبایل بنر بالای سایت را تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    {brandSettings.adminTemplate === "BLUEPRINT" ? <BlueprintHomepagePromoSettings initialSettings={settings} /> : <HomepagePromoSettings initialSettings={settings} />}
  </>;
}
