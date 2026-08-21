import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { ManualSmsForm } from "@/components/manual-sms-form";
import { requirePermission } from "@/modules/auth/session";

export const metadata: Metadata = { title: "ارسال پیامک جدید" };
export default async function NewManualSmsPage() { await requirePermission("settings:manage"); return <><AdminPageHeader eyebrow="پیامک و اعلان" title="ارسال پیامک جدید" description="مخاطبان هدف را انتخاب کنید، تعداد نهایی را بررسی کنید و پیام را ارسال کنید." backHref="/admin/settings/notifications/manual" backLabel="بازگشت به ارسال‌های دستی" /><ManualSmsForm /></>; }
