import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PaymentGatewayManager } from "@/components/payment-gateway-manager";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";

export const metadata: Metadata = { title: "درگاه‌های پرداخت" };

export default async function PaymentGatewaysPage() {
  await requireAdminUser();

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="درگاه‌های پرداخت"
      description="درگاه‌های ثبت‌شده و شناسه‌های اتصال فروشگاه را مدیریت کنید."
      backHref="/admin/settings"
      backLabel="بازگشت به تنظیمات"
      action={<AdminPrimaryLink href="/admin/settings/payment-gateways/new"><Plus size={17} />افزودن درگاه</AdminPrimaryLink>}
    />
    <PaymentGatewayManager mode="list" initialConfigs={await getPublicGatewayConfigs()} />
  </>;
}
