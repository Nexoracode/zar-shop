import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { BlueprintPaymentGatewayManager } from "@/components/admin/blueprint/payment-gateway-manager";
import { AdminPageHeader, AdminPrimaryLink } from "@/components/admin-ui";
import { requirePermission } from "@/modules/auth/session";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";
import { readHiddenColumns } from "@/lib/admin-column-visibility-server";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "درگاه‌های پرداخت" };

export default async function PaymentGatewaysPage() {
  await requirePermission("settings:manage");
  const [configs, initialHiddenColumns] = await Promise.all([getPublicGatewayConfigs(), readHiddenColumns("paymentGateways")]);

  return <>
    <AdminPageHeader
      eyebrow="تنظیمات سایت"
      title="درگاه‌های پرداخت"
      description="درگاه‌های ثبت‌شده و شناسه‌های اتصال فروشگاه را مدیریت کنید."
      backHref="/admin/settings"
      backLabel="بازگشت به تنظیمات"
      action={<AdminPrimaryLink href="/admin/settings/payment-gateways/new"><Plus size={17} />افزودن درگاه</AdminPrimaryLink>}
    />
    <BlueprintPaymentGatewayManager key={configs.map((config) => config.updatedAt).join("|")} mode="list" initialConfigs={configs} initialHiddenColumns={initialHiddenColumns} />
  </>;
}
