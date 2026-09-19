import "dotenv/config";
import { seedDemoAnalytics } from "./seeds/demo-analytics";
import { seedDevelopmentStore } from "./seeds/seed-store";

const args = process.argv.slice(2).map((value) => value.toLowerCase());

// `demo` only adds sample traffic and orders on top of a store that is already seeded; it never
// resets anything, so it is safe to run repeatedly (npm run db:seed:demo).
if (args.includes("demo")) {
  await seedDemoAnalytics();
} else {
  const target = args.find((value) => value === "gold" || value === "general");
  // Keep the central media library (گالری) intact while resetting everything else.
  const keepGallery = args.includes("--keep-gallery");

  if (target !== "gold" && target !== "general") {
    throw new Error("نوع seed مشخص نیست. از npm run db:seed:gold یا npm run db:seed:general یا npm run db:seed:demo استفاده کنید.");
  }

  await seedDevelopmentStore(target === "gold" ? "GOLD" : "GENERAL", { keepGallery });
}
