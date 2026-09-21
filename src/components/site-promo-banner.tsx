import Image from "next/image";
import Link from "next/link";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";
import { builderSectionProps } from "@/modules/page-builder/sections";
import { isSectionEnabled, type PageDisplay } from "@/modules/page-builder/display-parts";

export function SitePromoBanner({ settings, display, editable }: { settings: HomepageSettings; display: PageDisplay; /** The viewer can edit the page: a switched-off banner is still rendered so the builder can bring it back. */ editable: boolean }) {
  if (!settings.promoBannerEnabled) return null;
  if (!isSectionEnabled(display, "PROMO_BANNER") && !editable) return null;
  const desktop = settings.promoDesktopMedia;
  const mobile = settings.promoMobileMedia;
  if (!desktop && !mobile) return null;

  const banner = <div {...(settings.promoBannerHref ? {} : builderSectionProps("PROMO_BANNER"))} className="relative h-14 w-full overflow-hidden bg-[#eee8de] sm:h-[72px]">
    {mobile && <Image src={mobile.url} alt={mobile.alt ?? mobile.title ?? "پروموشن فروشگاه"} fill priority unoptimized={mobile.mimeType === "image/gif"} sizes="100vw" className={`object-cover ${desktop ? "sm:hidden" : ""}`} />}
    {desktop && <Image src={desktop.url} alt={desktop.alt ?? desktop.title ?? "پروموشن فروشگاه"} fill priority unoptimized={desktop.mimeType === "image/gif"} sizes="100vw" className={`object-cover ${mobile ? "hidden sm:block" : ""}`} />}
  </div>;

  return settings.promoBannerHref
    ? <Link href={settings.promoBannerHref} {...builderSectionProps("PROMO_BANNER")} aria-label="مشاهده پروموشن فروشگاه" className="block focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#d7b66e]">{banner}</Link>
    : banner;
}
