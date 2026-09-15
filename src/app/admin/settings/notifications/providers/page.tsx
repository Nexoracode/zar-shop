import type { Metadata } from "next";
import { Plus, Wallet } from "lucide-react";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { BlueprintSmsProviderManager } from "@/components/admin/blueprint/sms-provider-manager";
import { requirePermission } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";
import { getSmsAccountBalance } from "@/modules/communications/sms-patterns";

export const metadata: Metadata = { title: "ارائه‌دهندگان پیامک" };
export default async function SmsProvidersPage() {
  await requirePermission("settings:manage");
  const configs = await getPublicSmsProviderConfigs();
  const hasActiveFaraz = configs.some((config) => config.provider === "FARAZ_SMS" && config.isActive);
  const balance = hasActiveFaraz ? await getSmsAccountBalance().catch(() => null) : null;
  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title="ارائه‌دهندگان پیامک" description="اطلاعات اتصال و ارائه‌دهنده فعال ارسال را مدیریت کنید." backHref="/admin/settings/notifications" backLabel="بازگشت به پیامک و اعلان" action={<AdminPrimaryLink href="/admin/settings/notifications/providers/new"><Plus size={17} />افزودن ارائه‌دهنده</AdminPrimaryLink>} />
    {balance !== null && (
      <div className="bp-frame relative mb-2 flex items-center gap-3 p-[14px]">
        <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><Wallet size={17} /></span>
        <div className="min-w-0"><strong className="block text-[13px]">موجودی حساب فراز اس‌ام‌اس</strong><span className="bp-muted mt-0.5 block text-[12px]">{balance.toLocaleString("fa-IR")} ریال</span></div>
      </div>
    )}
    <BlueprintSmsProviderManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} />
  </>;
}
