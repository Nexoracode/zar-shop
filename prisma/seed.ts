import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "127.0.0.1",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "zar_store",
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

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: { email, firstName: "مدیر", lastName: "فروشگاه", role: "ADMIN", passwordHash: await hash(process.env.ADMIN_PASSWORD ?? "ChangeMe123!", 12) },
  });

  const women = await upsertCategory("زنانه", "women", 10, { featured: true });
  const men = await upsertCategory("مردانه", "men", 20, { featured: true });
  const kids = await upsertCategory("بچگانه", "kids", 30, { featured: true });
  const collections = await upsertCategory("کالکشن‌ها", "collections", 40, { featured: true });

  const rings = await upsertCategory("انگشتر زنانه", "rings", 10, { parentId: women.id });
  await upsertCategory("گردنبند زنانه", "women-necklaces", 20, { parentId: women.id });
  await upsertCategory("دستبند زنانه", "women-bracelets", 30, { parentId: women.id });
  await upsertCategory("گوشواره زنانه", "women-earrings", 40, { parentId: women.id });
  await upsertCategory("انگشتر مردانه", "men-rings", 10, { parentId: men.id });
  await upsertCategory("دستبند مردانه", "men-bracelets", 20, { parentId: men.id });
  await upsertCategory("آویز بچگانه", "kids-pendants", 10, { parentId: kids.id });
  await upsertCategory("کالکشن مینیمال", "minimal-collection", 10, { parentId: collections.id });

  await db.product.upsert({
    where: { sku: "ZAR-DEMO-001" },
    update: { categoryId: rings.id },
    create: {
      sku: "ZAR-DEMO-001",
      name: "انگشتر طلای مینیمال",
      slug: "minimal-gold-ring",
      description: "نمونه محصول اولیه فروشگاه",
      status: "ACTIVE",
      categoryId: rings.id,
      purity: 750,
      weightGrams: "2.850",
      makingFeeType: "PERCENT",
      makingFeeValue: "12",
      profitPercent: "7",
      taxPercent: "10",
      stock: 3,
      featured: true,
    },
  });

  if (await db.goldPrice.count() === 0) {
    await db.goldPrice.create({ data: { pricePerGram18: "48500000", source: "seed", fetchedAt: new Date() } });
  }
}

main().finally(() => db.$disconnect());
