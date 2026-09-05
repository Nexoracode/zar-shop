import type { Metadata } from "next";
import { PaymentGatewayManager } from "@/components/payment-gateway-manager";
import { BlueprintPaymentGatewayManager } from "@/components/admin/blueprint/payment-gateway-manager";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export const metadata: Metadata = { title: "افزودن درگاه پرداخت" };

export default async function NewPaymentGatewayPage() {
  await requirePermission("settings:manage");
  const [configs, brandSettings] = await Promise.all([getPublicGatewayConfigs(), getBrandSettings()]);

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="افزودن درگاه پرداخت"
      description="ارائه‌دهنده را انتخاب کنید، مراحل فعال‌سازی را ببینید و شناسه اتصال را ثبت کنید."
      backHref="/admin/settings/payment-gateways"
      backLabel="بازگشت به درگاه‌ها"
    />
    {brandSettings.adminTemplate === "BLUEPRINT" ? (
      <BlueprintPaymentGatewayManager mode="form" initialConfigs={configs} />
    ) : (
      <PaymentGatewayManager mode="form" initialConfigs={configs} />
    )}
  </>;
}
