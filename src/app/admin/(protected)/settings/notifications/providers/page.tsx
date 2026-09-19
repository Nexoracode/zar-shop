import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintSmsAccountOverview } from "@/components/admin/blueprint/sms-account-overview";
import { BlueprintSmsProviderManager } from "@/components/admin/blueprint/sms-provider-manager";
import { requirePermission } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ارائه‌دهندگان پیامک" };
export default async function SmsProvidersPage() {
  await requirePermission("settings:manage");
  const [configs, communicationSettings, general, initialHiddenColumns] = await Promise.all([getPublicSmsProviderConfigs(), getCommunicationSettings(), getGeneralStoreSettings(), readHiddenColumns("smsProviders")]);
  const faraz = configs.find((config) => config.provider === "FARAZ_SMS") ?? null;
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="ارائه‌دهندگان پیامک" description="اطلاعات اتصال، وضعیت حساب و ارائه‌دهنده فعال ارسال را مدیریت کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" action={<AdminPrimaryLink href="/admin/settings/notifications/providers/new"><Plus size={17} />افزودن ارائه‌دهنده</AdminPrimaryLink>} />
    {faraz?.isActive && !communicationSettings.smsEnabled && (
      <div className="bp-frame relative mb-2 flex items-start gap-3 border-[var(--bp-warning)] p-[14px]">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--bp-warning)]" />
        <div className="min-w-0 text-[12px] leading-6">
          <strong className="block text-[13px]">ارسال پیامک هنوز خاموش است</strong>
          ارائه‌دهنده فعال است، اما کلید «ارسال پیامک فعال باشد» در تنظیمات پیامک و اعلان روشن نیست؛ تا قبل از روشن‌کردنش کد یک‌بارمصرف یا پیامک دیگری ارسال نمی‌شود.
          <Link href="/admin/settings/notifications/preferences" className="mt-1 block font-bold text-[var(--bp-accent)]">رفتن به تنظیمات پیامک و اعلان ←</Link>
        </div>
      </div>
    )}
    {/* Loaded in the browser after the page renders, so a slow or failing Faraz never blocks this page. */}
    {faraz && <BlueprintSmsAccountOverview config={faraz} storeName={general.storeName} />}
    <BlueprintSmsProviderManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} initialHiddenColumns={initialHiddenColumns} />
  </>;
}
