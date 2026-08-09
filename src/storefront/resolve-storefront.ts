import { getStoreIndustry } from "@/modules/settings/store-settings";

export async function resolveStorefrontHome() {
  const industry = await getStoreIndustry();
  if (industry === "GENERAL") return (await import("@/storefront/general/home")).GeneralHome;
  return (await import("@/storefront/gold/home")).GoldHome;
}
