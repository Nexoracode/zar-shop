import "dotenv/config";
import { syncIranLocations } from "../src/modules/locations/service";
import { db } from "../src/lib/db";

try {
  const result = await syncIranLocations(true);
  console.info(`[locations] Synced ${result.provinces} provinces and ${result.cities} cities at ${result.syncedAt.toISOString()}.`);
} finally {
  await db.$disconnect();
}
