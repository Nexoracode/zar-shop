import { resolveStorefrontHome } from "@/storefront/resolve-storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const StorefrontHome = await resolveStorefrontHome();
  return <StorefrontHome />;
}
