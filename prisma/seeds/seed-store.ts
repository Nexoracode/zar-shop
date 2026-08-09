import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";
import type { StoreIndustry } from "../../generated/prisma/enums";
import { generalStoreSeed } from "./general.seed";
import { goldStoreSeed } from "./gold.seed";
import type { DevelopmentStoreSeed } from "./types";

const localDatabaseHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function assertDevelopmentDatabase() {
  const environment = process.env.NODE_ENV;
  const host = process.env.DATABASE_HOST ?? "127.0.0.1";
  if (environment !== "development") {
    throw new Error("Development seeds are disabled unless NODE_ENV=development.");
  }
  if (!localDatabaseHosts.has(host)) {
    throw new Error(`Development seeds can only target a local database host. Received: ${host}`);
  }
}

function createClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: process.env.DATABASE_HOST ?? "127.0.0.1",
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER ?? "root",
      password: process.env.DATABASE_PASSWORD ?? "",
      database: process.env.DATABASE_NAME ?? "store_db",
      connectionLimit: 2,
    }),
  });
}

async function clearDevelopmentData(db: PrismaClient) {
  await db.invoice.deleteMany();
  await db.payment.deleteMany();
  await db.promotionRedemption.deleteMany();
  await db.promotionReward.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.session.deleteMany();
  await db.address.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.productMedia.deleteMany();
  await db.productOption.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.color.deleteMany();
  await db.storeSetting.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.goldPrice.deleteMany();
  await db.promotion.deleteMany();
  await db.paymentGatewayConfig.deleteMany();
  await db.smsProviderConfig.deleteMany();
  await db.communicationSetting.deleteMany();
  await db.smsCampaign.deleteMany();
}

function homepageSections() {
  return ["HERO", "PROMISES", "CATEGORIES", "PRODUCTS", "ABOUT", "CONCIERGE"].map((id) => ({ id, enabled: true }));
}

function emptyTreasureCards() {
  return ["UNDER_20", "FROM_20_TO_60", "FROM_60_TO_100", "OVER_100"].map((id) => ({ id, mediaId: null }));
}

function emptyLicenses() {
  return ["SALES", "ONLINE", "ENAMAD"].map((id) => ({ id, mediaId: null, href: null }));
}

function generalHomepageSettings(menuCategoryIds: string[]) {
  return {
    sections: homepageSections(),
    menuCategoryIds,
    treasureCards: emptyTreasureCards(),
    licenses: emptyLicenses(),
    heroSlides: [],
    heroContentMode: "WITH_CONTENT",
    heroTitle: "خرید ساده، انتخاب مطمئن",
    heroDescription: "محصولات موردنیازتان را با قیمت شفاف، موجودی به‌روز و ارسال قابل پیگیری انتخاب کنید.",
    heroButtonLabel: "مشاهده محصولات",
    heroButtonHref: "/products",
    heroDesktopMediaId: null,
    heroMobileMediaId: null,
    promoBannerEnabled: false,
    promoBannerHref: null,
    promoDesktopMediaId: null,
    promoMobileMediaId: null,
  };
}

async function createStore(db: PrismaClient, seed: DevelopmentStoreSeed) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  await db.user.create({
    data: {
      email: adminEmail,
      firstName: "مدیر",
      lastName: "فروشگاه",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await hash(process.env.ADMIN_PASSWORD ?? "ChangeMe123!", 12),
    },
  });

  const categoryIds = new Map<string, string>();
  for (const [index, category] of seed.categories.entries()) {
    const created = await db.category.create({
      data: { name: category.name, slug: category.slug, description: category.description, attributeSchema: category.attributeSchema ?? [], featured: true, isActive: true, sortOrder: (index + 1) * 10 },
    });
    categoryIds.set(category.slug, created.id);
  }

  for (const product of seed.products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) throw new Error(`Seed category not found: ${product.categorySlug}`);
    const hasDiscount = Boolean(product.discountPercent);
    await db.product.create({
      data: {
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: `<p>${product.description}</p>`,
        status: "ACTIVE",
        storeIndustry: seed.industry,
        categoryId,
        purity: seed.industry === "GOLD" ? 750 : 0,
        weightGrams: seed.industry === "GOLD" ? product.weightGrams ?? "1.000" : "0",
        makingFeeType: "PERCENT",
        makingFeeValue: seed.industry === "GOLD" ? product.makingFeePercent ?? "0" : "0",
        profitPercent: seed.industry === "GOLD" ? "7" : "0",
        taxPercent: seed.industry === "GOLD" ? "10" : "0",
        fixedPrice: seed.industry === "GENERAL" ? product.fixedPrice : null,
        discountType: hasDiscount ? "PERCENT" : null,
        discountValue: product.discountPercent ?? null,
        discountStartsAt: hasDiscount ? new Date("2025-01-01T00:00:00.000Z") : null,
        discountEndsAt: hasDiscount ? new Date("2030-12-31T23:59:59.999Z") : null,
        stock: product.stock,
        preparationDays: 2,
        featured: product.featured ?? false,
        attributes: product.attributes ?? [],
      },
    });
  }

  const menuCategoryIds = [...categoryIds.values()];
  await db.storeSetting.create({
    data: {
      id: "main",
      industry: seed.industry,
      storeName: seed.storeName,
      tagline: seed.tagline,
      shortDescription: seed.shortDescription,
      menuCategoryIds,
      homepageSections: homepageSections(),
      homepageTreasureCards: emptyTreasureCards(),
      homepageLicenses: emptyLicenses(),
      homepageHeroSlides: [],
      generalHomepageSettings: seed.industry === "GENERAL" ? generalHomepageSettings(menuCategoryIds) : undefined,
      heroContentMode: "WITH_CONTENT",
      heroTitle: seed.industry === "GOLD" ? "درخشش ماندگار، انتخابی مطمئن" : "خرید ساده، انتخاب مطمئن",
      heroDescription: seed.industry === "GOLD" ? "جدیدترین زیورآلات طلا با قیمت لحظه‌ای و تضمین اصالت" : "محصولات کاربردی با قیمت شفاف و موجودی به‌روز",
      heroButtonLabel: "مشاهده محصولات",
      heroButtonHref: "/products",
      brandPrimaryColor: seed.industry === "GOLD" ? "#1C3155" : "#2563EB",
      brandAccentColor: seed.industry === "GOLD" ? "#B5904C" : "#0F766E",
      brandBackgroundColor: seed.industry === "GOLD" ? "#F7F6F3" : "#F6F7F9",
      brandDangerColor: "#B8423A",
      liveGoldPrice: seed.industry === "GOLD",
      orderNumberPrefix: seed.industry === "GOLD" ? "ZG" : "GS",
    },
  });

  if (seed.industry === "GOLD") {
    await db.goldPrice.create({ data: { pricePerGram18: "48500000", source: "development-seed", fetchedAt: new Date() } });
  }
}

export async function seedDevelopmentStore(industry: StoreIndustry) {
  assertDevelopmentDatabase();
  const db = createClient();
  const seed = industry === "GOLD" ? goldStoreSeed : generalStoreSeed;
  try {
    await clearDevelopmentData(db);
    await createStore(db, seed);
    const [categoryCount, productCount, industries, setting] = await Promise.all([
      db.category.count(),
      db.product.count(),
      db.product.groupBy({ by: ["storeIndustry"], _count: { _all: true } }),
      db.storeSetting.findUnique({ where: { id: "main" }, select: { industry: true } }),
    ]);
    if (categoryCount !== seed.categories.length || productCount !== seed.products.length || industries.length !== 1 || industries[0].storeIndustry !== industry || setting?.industry !== industry) {
      throw new Error("Development seed verification failed.");
    }
    console.info(`[seed] ${industry}: ${categoryCount} categories and ${productCount} products created.`);
  } finally {
    await db.$disconnect();
  }
}
