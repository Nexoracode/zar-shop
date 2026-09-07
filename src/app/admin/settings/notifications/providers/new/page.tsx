import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsProviderManager } from "@/components/admin/blueprint/sms-provider-manager";
import { requirePermission } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";

export const metadata: Metadata = { title: "افزودن ارائه‌دهنده پیامک" };
export default async function NewSmsProviderPage() {
  await requirePermission("settings:manage");
  const configs = await getPublicSmsProviderConfigs();
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="افزودن ارائه‌دهنده پیامک" description="سامانه پیامکی را انتخاب و اطلاعات وب‌سرویس را امن ثبت کنید." backHref="/admin/settings/notifications/providers" backLabel="بازگشت به ارائه‌دهندگان" />
    <BlueprintSmsProviderManager mode="form" initialConfigs={configs} />
  </>;
}
