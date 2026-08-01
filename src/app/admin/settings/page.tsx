import { AdminSettings } from "@/components/admin-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireAdminUser } from "@/modules/auth/session";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getHomepageSettings } from "@/modules/settings/homepage-settings";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { env } from "@/lib/env";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const [settings, homepageSettings, brandSettings, orderSettings, commerceSettings] = await Promise.all([getGeneralStoreSettings(), getHomepageSettings(), getBrandSettings(), getOrderSettings(), getCommerceSettings()]);
  return (
    <>
      <AdminPageHeader eyebrow="مرکز پیکربندی فروشگاه" title="تنظیمات سایت" description="ساختار، محتوای عمومی و قواعد عملیاتی فروشگاه را در یک محل مدیریت کنید." />
      <AdminSettings initialSettings={settings} initialHomepageSettings={homepageSettings} initialBrandSettings={brandSettings} initialOrderSettings={orderSettings} initialCommerceSettings={commerceSettings} paymentProviderLabel={env.PAYMENT_PROVIDER === "zarinpal" ? `زرین‌پال${env.ZARINPAL_SANDBOX ? " (Sandbox)" : ""}` : "درگاه آزمایشی"} />
    </>
  );
}
