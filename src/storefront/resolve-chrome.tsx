import type { User } from "@generated/prisma/client";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";

type HeaderProps = { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuItems: HomepageMenuItem[] };

export async function StorefrontHeader(props: HeaderProps) {
  if (props.settings.industry === "GENERAL") {
    const { GeneralHeader } = await import("@/storefront/general/header");
    return <GeneralHeader {...props} />;
  }
  const { GoldHeader } = await import("@/storefront/gold/header");
  return <GoldHeader {...props} />;
}

export async function StorefrontFooter({ settings, brand }: Pick<HeaderProps, "settings" | "brand">) {
  if (settings.industry === "GENERAL") {
    const { GeneralFooter } = await import("@/storefront/general/footer");
    return <GeneralFooter settings={settings} brand={brand} />;
  }
  const { GoldFooter } = await import("@/storefront/gold/footer");
  return <GoldFooter settings={settings} brand={brand} />;
}
