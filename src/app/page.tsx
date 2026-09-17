import type { Metadata } from "next";
import { resolveStorefrontHome } from "@/storefront/resolve-storefront";
import { env } from "@/lib/env";

// The product feed rendered here flags each card's favorite state per viewer
// (getStorefrontFlashDeals → markFavoriteCards → getCurrentUser), so this page is genuinely
// session-coupled today, not just settings-driven — same judgment call as the storefront
// header. A static shell would need decoupling favorites-flagging from the base product feed,
// which is a separate, larger change; left dynamic for now.
export const instant = false;

export function generateMetadata(): Metadata {
  return { alternates: { canonical: env.APP_URL } };
}

export default async function HomePage() {
  const StorefrontHome = await resolveStorefrontHome();
  return <StorefrontHome />;
}
