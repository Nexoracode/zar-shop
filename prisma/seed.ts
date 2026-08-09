import "dotenv/config";
import { seedDevelopmentStore } from "./seeds/seed-store";

const target = process.argv[2]?.toLowerCase();

if (target !== "gold" && target !== "general") {
  throw new Error("نوع seed مشخص نیست. از npm run db:seed:gold یا npm run db:seed:general استفاده کنید.");
}

await seedDevelopmentStore(target === "gold" ? "GOLD" : "GENERAL");
