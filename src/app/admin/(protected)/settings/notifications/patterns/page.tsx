import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintSmsPatternList } from "@/components/admin/blueprint/sms-pattern-manager";
import { requirePermission } from "@/modules/auth/session";
import { listSmsPatterns } from "@/modules/communications/sms-patterns";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "پترن‌های پیامک" };

export default async function SmsPatternsPage() {
  await requirePermission("settings:manage");
  let patterns: Awaited<ReturnType<typeof listSmsPatterns>> = [];
  let loadError: string | null = null;
  try { patterns = await listSmsPatterns(); }
  catch (error) { loadError = error instanceof Error ? error.message : "دریافت پترن‌ها انجام نشد."; }

  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="پترن‌های پیامک" description="پترن‌های تأییدشده حساب فراز اس‌ام‌اس را برای ارسال کد تأیید و پیام‌های خودکار مدیریت کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" action={<AdminPrimaryLink href="/admin/settings/notifications/patterns/new"><Plus size={17} />افزودن پترن</AdminPrimaryLink>} />
    {loadError ? (
      <div className="bp-frame relative flex items-start gap-2.5 border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-[16px] text-[var(--bp-danger)]">
        <p className="m-0 text-[13px] leading-6">{loadError}</p>
      </div>
    ) : <BlueprintSmsPatternList initialPatterns={patterns} />}
  </>;
}
