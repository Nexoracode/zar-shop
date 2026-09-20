import "dotenv/config";
import { seedDemoAnalytics } from "./seeds/demo-analytics";
import { seedSampleStoreIfEmpty } from "./seeds/seed-store";

/**
 * Sample data for a hosted DEMO deployment, run from the Vercel build command (see vercel.json).
 *
 * It does nothing unless the deployment asks for it, so the same build command is safe for a real
 * store: the sample store is only added when `SEED_DEMO_ON_BUILD` is set on that Vercel project, and
 * only to a database that has no catalogue yet — a redeploy never touches what is already there.
 * It never wipes anything (that is what `db:seed:general` does, and it is for local databases only).
 *
 *   SEED_DEMO_ON_BUILD   true | general -> a general shop, gold -> a gold shop; unset -> skip
 *   SEED_DEMO_TRAFFIC    true -> also add sample traffic and orders for the dashboard; they are
 *                        replaced (with fresh dates) on every build
 */
const flag = process.env.SEED_DEMO_ON_BUILD?.trim().toLowerCase();
const industry = flag === "gold" ? "GOLD" : flag === "true" || flag === "general" ? "GENERAL" : null;

if (!industry) {
  console.info("[seed:vercel] SEED_DEMO_ON_BUILD is not set - no sample data added.");
} else {
  const result = await seedSampleStoreIfEmpty(industry);
  if (result.seeded) {
    const { variantCatalog } = result;
    console.info(`[seed:vercel] ${industry} sample store added: ${result.products} products${variantCatalog.products ? ` (${variantCatalog.products} sold by combination: ${variantCatalog.variants} combinations, ${variantCatalog.colors} colours, ${variantCatalog.optionTypes} option types)` : ""}.`);
  } else {
    console.info("[seed:vercel] the database already has a catalogue - sample store left alone.");
  }
  if (process.env.SEED_DEMO_TRAFFIC?.trim().toLowerCase() === "true") await seedDemoAnalytics({ allowRemote: true });
}
