import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintManualSmsForm } from "@/components/admin/blueprint/manual-sms-form";
import { requirePermission } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ارسال پیامک جدید" };
export default async function NewManualSmsPage() {
  await requirePermission("settings:manage");
    return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="ارسال پیامک جدید" description="مخاطبان هدف را انتخاب کنید، تعداد نهایی را بررسی کنید و پیام را ارسال کنید." backHref="/admin/settings/notifications/manual" backLabel="بازگشت به ارسال‌های دستی" />
    <BlueprintManualSmsForm />
  </>;
}
