import type { Metadata } from "next";
import { resolveStorefrontHome } from "@/storefront/resolve-storefront";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { alternates: { canonical: env.APP_URL } };
}

export default async function HomePage() {
  const StorefrontHome = await resolveStorefrontHome();
  return <StorefrontHome />;
}
