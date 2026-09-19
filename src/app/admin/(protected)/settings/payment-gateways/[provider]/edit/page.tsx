import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlueprintPaymentGatewayManager } from "@/components/admin/blueprint/payment-gateway-manager";
import { AdminPageHeader } from "@/components/admin-ui";
import { env } from "@/lib/env";
import { requirePermission } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";
import { gatewayProviderSchema } from "@/modules/payments/gateway-providers";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "ویرایش درگاه پرداخت" };

export default async function EditPaymentGatewayPage({ params }: { params: Promise<{ provider: string }> }) {
  await requirePermission("settings:manage");
  const { provider: rawProvider } = await params;
  const parsedProvider = gatewayProviderSchema.safeParse(rawProvider);
  if (!parsedProvider.success) notFound();

  const configs = await getPublicGatewayConfigs();
  const existing = configs.find((config) => config.provider === parsedProvider.data);
  if (!existing) notFound();

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title={`ویرایش ${existing.displayName}`}
      description="شناسه اتصال رمزنگاری‌شده است و نمایش داده نمی‌شود؛ فقط برای تغییر آن، مقدار تازه را وارد کنید. حالت آزمایشی یا زنده را هم از همین‌جا عوض می‌کنید."
      backHref="/admin/settings/payment-gateways"
      backLabel="بازگشت به درگاه‌ها"
    />
    <BlueprintPaymentGatewayManager mode="form" initialConfigs={configs} appUrl={env.APP_URL} editingProvider={existing.provider} />
  </>;
}
