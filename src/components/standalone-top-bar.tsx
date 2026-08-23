import Image from "next/image";
import Link from "next/link";
import { getBrandSettings } from "@/modules/settings/brand-settings";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";
import { BackControl } from "@/components/back-control";

// A minimal top bar for standalone pages (checkout, auth) that render without the full
// storefront header/footer: just a centered logo and a back link, so the page isn't
// left with zero navigation. Pass backHref="back" to go to whatever page the visitor
// actually came from (browser history) instead of one fixed destination.
export async function StandaloneTopBar({ backHref, backLabel = "بازگشت" }: { backHref: string; backLabel?: string }) {
  const [brand, settings] = await Promise.all([getBrandSettings(), getGeneralStoreSettings()]);
  const logo = brand.mainLogoMedia
    ? <span className="relative block h-10 w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
    : <strong className="text-base font-bold text-[var(--brand-primary)]">{settings.storeName}</strong>;

  return (
    <div className="w-full border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="relative mx-auto flex min-h-16 max-w-[1280px] items-center px-4 sm:px-6">
        <Link href="/" className="mx-auto shrink-0" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <BackControl href={backHref} label={backLabel} className="absolute right-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--brand-primary)] sm:right-6" />
      </div>
    </div>
  );
}
