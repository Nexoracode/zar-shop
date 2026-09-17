import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintHomepageLayoutSettings } from "@/components/admin/blueprint/homepage-layout-settings";
import { requirePermission } from "@/modules/auth/session";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "مدیریت چینش صفحه اصلی" };

export default async function HomepageLayoutSettingsPage() {
  await requirePermission("settings:manage");
  const settings = await getHomepageSettings();
  return <>
    <AdminPageHeader eyebrow="تنظیمات صفحه اصلی" title="مدیریت چینش" description="ترتیب تمام بخش‌ها و ردیف‌های تایل را با پیش‌نمایش زنده دسکتاپ و موبایل تنظیم کنید." backHref="/admin/settings/homepage" backLabel="بازگشت به تنظیمات صفحه اصلی" />
    <BlueprintHomepageLayoutSettings initialSettings={settings} />
  </>;
}
