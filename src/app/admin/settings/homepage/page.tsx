import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintHomepageSettingsHub } from "@/components/admin/blueprint/homepage-settings-hub";
import { requirePermission } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";

export const metadata: Metadata = { title: "تنظیمات صفحه اصلی" };

export default async function HomepageSettingsHubPage() {
  await requirePermission("settings:manage");
  const [homepageSettings, industry] = await Promise.all([getHomepageSettings(), getStoreIndustry()]);
  return <>
    <AdminPageHeader eyebrow="تنظیمات سایت" title="تنظیمات صفحه اصلی" description="اسلایدر، بنر تبلیغاتی و ترتیب نمایش بخش‌های صفحه اصلی" backHref="/admin/settings" backLabel="بازگشت به تنظیمات" />
    <BlueprintHomepageSettingsHub initialSettings={homepageSettings} industry={industry} />
  </>;
}
