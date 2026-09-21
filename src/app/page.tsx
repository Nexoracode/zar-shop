import type { Metadata } from "next";
import { connection } from "next/server";
import { PageBuilderBar } from "@/components/page-builder-bar";
import { getCurrentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { resolveStorefrontHome } from "@/storefront/resolve-storefront";
import { env } from "@/lib/env";

export function generateMetadata(): Metadata {
  return { alternates: { canonical: env.APP_URL } };
}

export default async function HomePage() {
  // The product feed rendered by StorefrontHome flags each card's favorite state per viewer
  // (getStorefrontFlashDeals → markFavoriteCards → getCurrentUser), and that cookies() read
  // happens after other uncached DB reads in the same data-fetch chain, so it can't establish
  // dynamic rendering on its own during prerendering. `connection()` marks this render as
  // request-time explicitly, before any of that runs. A static shell would need decoupling
  // favorites-flagging from the base product feed — a separate, larger change.
  await connection();
  const StorefrontHome = await resolveStorefrontHome();
  // The page builder edits store-wide homepage configuration, which is the `settings:manage`
  // permission (ADMIN only) — the same gate as the admin homepage settings pages.
  const user = await getCurrentUser();
  const canEditPages = Boolean(user && hasPermission(user.role, "settings:manage"));
  return (
    <>
      <StorefrontHome />
      {canEditPages ? <PageBuilderBar /> : null}
    </>
  );
}
