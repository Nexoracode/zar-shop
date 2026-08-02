import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "127.0.0.1",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "store_db",
  connectionLimit: 2,
});
const db = new PrismaClient({ adapter });

async function upsertCategory(name: string, slug: string, sortOrder: number, options?: { parentId?: string; featured?: boolean }) {
  return db.category.upsert({
    where: { slug },
    update: { name, sortOrder, parentId: options?.parentId ?? null, featured: options?.featured ?? false, isActive: true },
    create: { name, slug, sortOrder, parentId: options?.parentId, featured: options?.featured ?? false },
  });
}

type SeedProduct = {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  weightGrams: string;
  makingFeePercent: string;
  featured?: boolean;
};

// Public catalog snapshot from remasgallery.com, collected on 2026-08-02.
// Prices are intentionally omitted because this store calculates them from the live gold rate.
const categorySeeds = [
  { name: "انگشتر", slug: "rings", sortOrder: 10 },
  { name: "دستبند", slug: "bracelets", sortOrder: 20 },
  { name: "گردنبند", slug: "necklaces", sortOrder: 30 },
  { name: "گوشواره", slug: "earrings", sortOrder: 40 },
  { name: "سرویس", slug: "services", sortOrder: 50 },
  { name: "نیم‌ست", slug: "half-sets", sortOrder: 60 },
  { name: "مدال و آویز", slug: "pendants", sortOrder: 70 },
  { name: "زنجیر", slug: "chains", sortOrder: 80 },
  { name: "النگو", slug: "bangles", sortOrder: 90 },
] as const;

const productSeeds: SeedProduct[] = [
  { sku: "REMAS-155393", name: "نیم‌ست قلب تی‌اند‌جی", slug: "heart-t-and-g-half-set", categorySlug: "half-sets", weightGrams: "8.120", makingFeePercent: "10.5", featured: true },
  { sku: "REMAS-SEED-002", name: "دستبند ونکلیف سوپر", slug: "van-cleef-super-bracelet", categorySlug: "bracelets", weightGrams: "1.360", makingFeePercent: "10.5", featured: true },
  { sku: "REMAS-168869", name: "نیم‌ست کارتیه", slug: "cartier-half-set", categorySlug: "half-sets", weightGrams: "5.240", makingFeePercent: "10.5", featured: true },
  { sku: "REMAS-SEED-004", name: "گردنبند یورمن پاپیون", slug: "yurman-bow-necklace", categorySlug: "necklaces", weightGrams: "3.610", makingFeePercent: "10.5", featured: true },
  { sku: "REMAS-SEED-005", name: "مدال تک", slug: "single-gold-pendant", categorySlug: "pendants", weightGrams: "2.760", makingFeePercent: "4.5", featured: true },
  { sku: "REMAS-SEED-006", name: "گردنبند آبنباتی ایس‌کات", slug: "ice-cut-candy-necklace", categorySlug: "necklaces", weightGrams: "4.470", makingFeePercent: "15.5" },
  { sku: "REMAS-SEED-007", name: "گوشواره دلین", slug: "delin-earrings", categorySlug: "earrings", weightGrams: "1.540", makingFeePercent: "11.5", featured: true },
  { sku: "REMAS-SEED-008", name: "گردنبند فانتزی درسام", slug: "dorsam-fantasy-necklace", categorySlug: "necklaces", weightGrams: "2.300", makingFeePercent: "10.5" },
  { sku: "REMAS-SEED-009", name: "انگشتر دوریکا", slug: "dorika-ring", categorySlug: "rings", weightGrams: "4.240", makingFeePercent: "11.5", featured: true },
  { sku: "REMAS-SEED-010", name: "ست انگشتر مردانه و زنانه", slug: "couple-gold-ring-set", categorySlug: "rings", weightGrams: "5.670", makingFeePercent: "4.5" },
  { sku: "REMAS-SEED-011", name: "دستبند چرم امگا", slug: "omega-leather-bracelet", categorySlug: "bracelets", weightGrams: "4.080", makingFeePercent: "10.5" },
  { sku: "REMAS-SEED-012", name: "گردنبند ملورین", slug: "melorin-necklace", categorySlug: "necklaces", weightGrams: "35.270", makingFeePercent: "5.5" },
  { sku: "REMAS-SEED-013", name: "النگو بچگانه اسب تک‌شاخ", slug: "kids-unicorn-bangle", categorySlug: "bangles", weightGrams: "2.480", makingFeePercent: "10.5", featured: true },
  { sku: "REMAS-SEED-014", name: "زنجیر فلامینگو", slug: "flamingo-chain", categorySlug: "chains", weightGrams: "1.680", makingFeePercent: "8.5" },
  { sku: "REMAS-SEED-015", name: "دستبند ورساچه ام‌جی‌ام", slug: "versace-mgm-bracelet", categorySlug: "bracelets", weightGrams: "11.870", makingFeePercent: "14.5" },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: { email, firstName: "مدیر", lastName: "فروشگاه", role: "ADMIN", passwordHash: await hash(process.env.ADMIN_PASSWORD ?? "ChangeMe123!", 12) },
  });

  const categories = new Map<string, string>();
  for (const category of categorySeeds) {
    const saved = await upsertCategory(category.name, category.slug, category.sortOrder, { featured: true });
    categories.set(category.slug, saved.id);
  }

  for (const product of productSeeds) {
    const categoryId = categories.get(product.categorySlug);
    if (!categoryId) throw new Error(`Seed category not found: ${product.categorySlug}`);
    const data = {
      name: product.name,
      slug: product.slug,
      description: `محصول طلای ۱۸ عیار با وزن مرجع ${product.weightGrams} گرم و اجرت ساخت ${product.makingFeePercent} درصد. قیمت نهایی بر اساس نرخ روز طلا محاسبه می‌شود.`,
      status: "ACTIVE" as const,
      storeIndustry: "GOLD" as const,
      categoryId,
      purity: 750,
      weightGrams: product.weightGrams,
      makingFeeType: "PERCENT",
      makingFeeValue: product.makingFeePercent,
      profitPercent: "0",
      taxPercent: "0",
      fixedPrice: null,
      stock: 1,
      preparationDays: 3,
      featured: product.featured ?? false,
    };
    await db.product.upsert({ where: { sku: product.sku }, update: data, create: { sku: product.sku, ...data } });
  }

  if (await db.goldPrice.count() === 0) {
    await db.goldPrice.create({ data: { pricePerGram18: "48500000", source: "seed", fetchedAt: new Date() } });
  }
}

main().finally(() => db.$disconnect());
