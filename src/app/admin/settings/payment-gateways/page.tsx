import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PaymentGatewayManager } from "@/components/payment-gateway-manager";
import { BlueprintPaymentGatewayManager } from "@/components/admin/blueprint/payment-gateway-manager";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";
import { getBrandSettings } from "@/modules/settings/brand-settings";

export const metadata: Metadata = { title: "درگاه‌های پرداخت" };

export default async function PaymentGatewaysPage() {
  await requirePermission("settings:manage");
  const [configs, brandSettings] = await Promise.all([getPublicGatewayConfigs(), getBrandSettings()]);

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="درگاه‌های پرداخت"
      description="درگاه‌های ثبت‌شده و شناسه‌های اتصال فروشگاه را مدیریت کنید."
      backHref="/admin/settings"
      backLabel="بازگشت به تنظیمات"
      action={<AdminPrimaryLink href="/admin/settings/payment-gateways/new"><Plus size={17} />افزودن درگاه</AdminPrimaryLink>}
    />
    {brandSettings.adminTemplate === "BLUEPRINT" ? (
      <BlueprintPaymentGatewayManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} />
    ) : (
      <PaymentGatewayManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} />
    )}
  </>;
}
