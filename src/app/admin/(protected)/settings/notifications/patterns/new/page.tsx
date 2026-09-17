import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsPatternForm } from "@/components/admin/blueprint/sms-pattern-manager";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "افزودن پترن پیامک" };
export default async function NewSmsPatternPage() {
  await requirePermission("settings:manage");
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="افزودن پترن پیامک" description="متن، متغیرها و دستهٔ پترن جدید را در حساب فراز اس‌ام‌اس ثبت کنید." backHref="/admin/settings/notifications/patterns" backLabel="بازگشت به پترن‌های پیامک" />
    <BlueprintSmsPatternForm />
  </>;
}
