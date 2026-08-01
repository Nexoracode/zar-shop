import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PaymentGatewayManager } from "@/components/payment-gateway-manager";
import { AdminBackLink, AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
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
      action={<div className="flex flex-wrap items-center gap-2"><AdminBackLink href="/admin/settings">بازگشت به تنظیمات</AdminBackLink><AdminPrimaryLink href="/admin/settings/payment-gateways/new"><Plus size={17} />افزودن درگاه</AdminPrimaryLink></div>}
    />
    <PaymentGatewayManager mode="list" initialConfigs={await getPublicGatewayConfigs()} />
  </>;
}
