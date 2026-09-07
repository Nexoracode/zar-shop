import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlueprintGeneralSettings } from "@/components/admin/blueprint/general-settings";
import { BlueprintBrandingSettings } from "@/components/admin/blueprint/branding-settings";
import { BlueprintOrderSettings } from "@/components/admin/blueprint/order-settings";
import { BlueprintCatalogSettings } from "@/components/admin/blueprint/catalog-settings";
import { BlueprintCommerceSettings } from "@/components/admin/blueprint/commerce-settings";
import { BlueprintContentSettings } from "@/components/admin/blueprint/content-settings";
import { BlueprintSeoSettings } from "@/components/admin/blueprint/seo-settings";
import { BlueprintWalletSettings } from "@/components/admin/blueprint/wallet-settings";
import { AdminPageHeader } from "@/components/admin-ui";
import { settingsSectionPermission } from "@/modules/auth/permissions";
import { requirePermission } from "@/modules/auth/session";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
// getBrandSettings stays: the branding section still edits the brand settings row.
import { getCommerceSettings } from "@/modules/settings/commerce-settings";
import { getContentSettings } from "@/modules/settings/content-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { getOrderSettings } from "@/modules/settings/order-settings";
import { getStoreIndustry } from "@/modules/settings/store-settings";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { getPublicGatewayConfigs } from "@/modules/payments/gateway-config";

type Context = { params: Promise<{ section: string }> };

const sectionMeta = {
  general: { title: "تنظیمات عمومی", description: "اطلاعات اصلی، راه‌های تماس و وضعیت فعالیت فروشگاه" },
  branding: { title: "تنظیمات ظاهر و برند", description: "رنگ‌ها، لوگوها و رفتار نمایشی فروشگاه" },
  orders: { title: "تنظیمات سفارش و انقضا", description: "مهلت پرداخت، شماره‌گذاری و قواعد ثبت سفارش" },
  commerce: { title: "تنظیمات ارسال و پرداخت", description: "روش‌های تحویل سفارش و وضعیت درگاه پرداخت" },
  content: { title: "تنظیمات محتوا و سوالات متداول", description: "مدیریت FAQ و صفحات راهنما و قوانین فروشگاه" },
  seo: { title: "SEO حرفه‌ای", description: "تنظیمات دیده‌شدن فروشگاه و ساختار فنی صفحات برای موتورهای جستجو" },
  wallet: { title: "کیف پول و دعوت دوستان", description: "اعتبار داخل فروشگاه، پرداخت با کیف پول و پاداش دعوت دوستان" },
} as const;

async function getPageMeta(section: string) {
  if (section === "catalog") {
    const industry = await getStoreIndustry();
    return industry === "GOLD"
      ? { title: "تنظیمات محصول و قیمت طلا", description: "موجودی، نمایش کاتالوگ و رفتار نرخ قیمت‌گذاری" }
      : { title: "تنظیمات محصولات", description: "موجودی و نحوه نمایش محصولات در فروشگاه" };
  }
  return sectionMeta[section as keyof typeof sectionMeta] ?? null;
}

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { section } = await params;
  const meta = await getPageMeta(section);
  return { title: meta?.title ?? "تنظیمات" };
}

export default async function AdminSettingSectionPage({ params }: Context) {
  const { section } = await params;
  // The section itself decides the permission: catalog/orders/commerce belong to the
  // matching manager role, everything else is store-wide configuration (ADMIN only).
  await requirePermission(settingsSectionPermission(section));
  const meta = await getPageMeta(section);
  if (!meta) notFound();

  let content;
  switch (section) {
    case "general": {
      content = <BlueprintGeneralSettings initialSettings={await getGeneralStoreSettings()} />;
      break;
    }
    case "branding": {
      const [brandSettings, industry] = await Promise.all([getBrandSettings(), getStoreIndustry()]);
      content = <BlueprintBrandingSettings initialSettings={brandSettings} industry={industry} />;
      break;
    }
    case "orders": {
      content = <BlueprintOrderSettings initialSettings={await getOrderSettings()} />;
      break;
    }
    case "catalog": {
      content = <BlueprintCatalogSettings initialSettings={await getCatalogSettings()} />;
      break;
    }
    case "commerce": {
      const [settings, gateways] = await Promise.all([getCommerceSettings(), getPublicGatewayConfigs()]);
      content = <BlueprintCommerceSettings initialSettings={settings} configuredGatewayCount={gateways.length} />;
      break;
    }
    case "content": {
      content = <BlueprintContentSettings initialSettings={await getContentSettings()} />;
      break;
    }
    case "seo": {
      content = <BlueprintSeoSettings />;
      break;
    }
    case "wallet": {
      content = <BlueprintWalletSettings initialSettings={await getWalletSettings()} />;
      break;
    }
    default: notFound();
  }

  return <>
    <AdminPageHeader eyebrow="تنظیمات سایت" title={meta.title} description={meta.description} backHref="/admin/settings" backLabel="بازگشت به تنظیمات" />
    {content}
  </>;
}
