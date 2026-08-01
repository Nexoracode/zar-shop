import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { SmsProviderManager } from "@/components/sms-provider-manager";
import { requireAdminUser } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";

export const metadata: Metadata = { title: "افزودن ارائه‌دهنده پیامک" };
export default async function NewSmsProviderPage() { await requireAdminUser(); return <><AdminPageHeader eyebrow="پیامک و اعلان" title="افزودن ارائه‌دهنده پیامک" description="سامانه پیامکی را انتخاب و اطلاعات وب‌سرویس را امن ثبت کنید." backHref="/admin/settings/notifications/providers" backLabel="بازگشت به ارائه‌دهندگان" /><SmsProviderManager mode="form" initialConfigs={await getPublicSmsProviderConfigs()} /></>; }
