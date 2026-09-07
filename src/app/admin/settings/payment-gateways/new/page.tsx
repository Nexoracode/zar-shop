import type { Metadata } from "next";
import { BlueprintPaymentGatewayManager } from "@/components/admin/blueprint/payment-gateway-manager";
import { AdminPageHeader } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";

export const metadata: Metadata = { title: "افزودن درگاه پرداخت" };

export default async function NewPaymentGatewayPage() {
  await requirePermission("settings:manage");
  const configs = await getPublicGatewayConfigs();

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="افزودن درگاه پرداخت"
      description="ارائه‌دهنده را انتخاب کنید، مراحل فعال‌سازی را ببینید و شناسه اتصال را ثبت کنید."
      backHref="/admin/settings/payment-gateways"
      backLabel="بازگشت به درگاه‌ها"
    />
    <BlueprintPaymentGatewayManager mode="form" initialConfigs={configs} />
  </>;
}
