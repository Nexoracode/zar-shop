import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsPatternForm } from "@/components/admin/blueprint/sms-pattern-manager";
import { requirePermission } from "@/modules/auth/session";

export const metadata: Metadata = { title: "افزودن پترن پیامک" };
export default async function NewSmsPatternPage() {
  await requirePermission("settings:manage");
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="افزودن پترن پیامک" description="متن، متغیرها و دستهٔ پترن جدید را در حساب فراز اس‌ام‌اس ثبت کنید." backHref="/admin/settings/notifications/patterns" backLabel="بازگشت به پترن‌های پیامک" />
    <BlueprintSmsPatternForm />
  </>;
}
