import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-ui";
import { BlueprintSmsProviderManager } from "@/components/admin/blueprint/sms-provider-manager";
import { requirePermission } from "@/modules/auth/session";
import { getPublicSmsProviderConfigs } from "@/modules/communications/sms-config";
import { getCommunicationSettings } from "@/modules/communications/communication-settings";
import { smsProviderSchema } from "@/modules/communications/sms-providers";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ویرایش ارائه‌دهنده پیامک" };

export default async function EditSmsProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  await requirePermission("settings:manage");
  const { provider: rawProvider } = await params;
  const parsedProvider = smsProviderSchema.safeParse(rawProvider);
  if (!parsedProvider.success) notFound();

  const [configs, communicationSettings] = await Promise.all([getPublicSmsProviderConfigs(), getCommunicationSettings()]);
  const existing = configs.find((config) => config.provider === parsedProvider.data);
  if (!existing) notFound();

  return <>
    <AdminPageHeader eyebrow="پیامک و اعلان" title={`ویرایش ${existing.displayName}`} description="اعتبارنامه اتصال رمزنگاری‌شده است و باید دوباره وارد شود؛ سرشماره فعلی از پیش پر شده است." backHref="/admin/settings/notifications/providers" backLabel="بازگشت به ارائه‌دهندگان" />
    <BlueprintSmsProviderManager mode="form" initialConfigs={configs} smsEnabled={communicationSettings.smsEnabled} editingProvider={existing.provider} initialSenderNumber={existing.senderNumber} />
  </>;
}
