import type { Metadata } from "next";
import { PaymentGatewayManager } from "@/components/payment-gateway-manager";
import { AdminBackLink, AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";

export const metadata: Metadata = { title: "افزودن درگاه پرداخت" };

export default async function NewPaymentGatewayPage() {
  await requireAdminUser();

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="افزودن درگاه پرداخت"
      description="ارائه‌دهنده را انتخاب کنید، مراحل فعال‌سازی را ببینید و شناسه اتصال را ثبت کنید."
      action={<AdminBackLink href="/admin/settings/payment-gateways">بازگشت به درگاه‌ها</AdminBackLink>}
    />
    <PaymentGatewayManager mode="form" initialConfigs={await getPublicGatewayConfigs()} />
  </>;
}
