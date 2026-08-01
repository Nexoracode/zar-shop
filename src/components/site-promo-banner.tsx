import Image from "next/image";
import Link from "next/link";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

export function SitePromoBanner({ settings }: { settings: HomepageSettings }) {
  if (!settings.promoBannerEnabled) return null;
  const desktop = settings.promoDesktopMedia;
  const mobile = settings.promoMobileMedia;
  if (!desktop && !mobile) return null;

  const banner = <div className="relative h-14 w-full overflow-hidden bg-[#eee8de] sm:h-[72px]">
    {mobile && <Image src={mobile.url} alt={mobile.alt ?? mobile.title ?? "پروموشن فروشگاه"} fill priority unoptimized={mobile.mimeType === "image/gif"} sizes="100vw" className={`object-cover ${desktop ? "sm:hidden" : ""}`} />}
    {desktop && <Image src={desktop.url} alt={desktop.alt ?? desktop.title ?? "پروموشن فروشگاه"} fill priority unoptimized={desktop.mimeType === "image/gif"} sizes="100vw" className={`object-cover ${mobile ? "hidden sm:block" : ""}`} />}
  </div>;

  return settings.promoBannerHref
    ? <Link href={settings.promoBannerHref} aria-label="مشاهده پروموشن فروشگاه" className="block focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#d7b66e]">{banner}</Link>
    : banner;
}
