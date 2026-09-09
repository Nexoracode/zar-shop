import "dotenv/config";
import { seedDevelopmentStore } from "./seeds/seed-store";

const args = process.argv.slice(2).map((value) => value.toLowerCase());
const target = args.find((value) => value === "gold" || value === "general");
// Keep the central media library (گالری) intact while resetting everything else.
const keepGallery = args.includes("--keep-gallery");

if (target !== "gold" && target !== "general") {
  throw new Error("نوع seed مشخص نیست. از npm run db:seed:gold یا npm run db:seed:general استفاده کنید.");
}

await seedDevelopmentStore(target === "gold" ? "GOLD" : "GENERAL", { keepGallery });
