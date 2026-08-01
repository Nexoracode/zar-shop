import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-ui";
import { CommunicationsNavigation } from "@/components/communications-navigation";
import { requireAdminUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "پیامک و اعلان" };
export default async function NotificationsPage() { await requireAdminUser(); return <><AdminPageHeader eyebrow="تنظیمات سایت" title="پیامک و اعلان" description="ارائه‌دهندگان، پیام‌های خودکار و ارسال‌های دستی فروشگاه را مدیریت کنید." backHref="/admin/settings" backLabel="بازگشت به تنظیمات" /><CommunicationsNavigation /></>; }
