import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";
import type { StoreIndustry } from "../../generated/prisma/enums";
import { generalStoreSeed } from "./general.seed";
import { goldStoreSeed } from "./gold.seed";
import { STANDARD_PACKAGING_BOX } from "../../src/modules/shipping/packaging";
import type { DevelopmentHomepageMediaSeed, DevelopmentStoreSeed } from "./types";

const localDatabaseHosts = new Set(["127.0.0.1", "localhost", "::1"]);

export function assertDevelopmentDatabase() {
  const environment = process.env.NODE_ENV;
  const host = process.env.DATABASE_HOST ?? "127.0.0.1";
  if (environment !== "development") {
    throw new Error("Development seeds are disabled unless NODE_ENV=development.");
  }
  if (!localDatabaseHosts.has(host)) {
    throw new Error(`Development seeds can only target a local database host. Received: ${host}`);
  }
}

export function createClient() {
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

// Rows that must survive a reseed:
// - `_prisma_migrations` is Prisma's own migration ledger.
// - `Province` / `City` are reference data loaded separately (npm run db:sync-locations).
// - `SupportTicketCategory` is seeded by its own migration and never recreated here.
// With `keepGallery`, `MediaAsset` is added too: the central media library's files live on
// the FTP host independent of the database, so preserving these rows keeps every uploaded
// image/video wired up instead of forcing a re-upload through the admin panel after a reset.
const ALWAYS_PRESERVED_TABLES = ["_prisma_migrations", "Province", "City", "SupportTicketCategory"];

// A full wipe of every other table — not just the ones the seed repopulates — so "reseed"
// means the store really is back to a known baseline (no leftover orders, reviews, wallets,
// tickets, notifications, …). TRUNCATE with FK checks off avoids having to hand-order ~40
// deletes and stays correct as the schema grows.
async function clearDevelopmentData(db: PrismaClient, options: { keepGallery: boolean }) {
  const preserved = new Set(ALWAYS_PRESERVED_TABLES);
  if (options.keepGallery) preserved.add("MediaAsset");

  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
  );
  const targets = rows.map((row) => row.name).filter((name) => !preserved.has(name));
  if (targets.length === 0) return;

  // One sequential transaction so every statement runs on the same connection and the
  // session-level FK-check toggle actually covers the TRUNCATEs. Prisma's default 5s
  // interactive-transaction timeout is tuned for a local database; ~40 TRUNCATEs over a
  // higher-latency connection can run past it, so it's raised explicitly.
  await db.$transaction([
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0"),
    ...targets.map((table) => db.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``)),
    db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"),
  ], { timeout: 30_000 });
}

function homepageSections() {
  return ["HERO", "CATEGORIES", "PROMISES", "PRODUCTS", "ABOUT", "CONCIERGE"].map((id) => ({ id, enabled: true }));
}

function emptyTreasureCards() {
  return ["UNDER_20", "FROM_20_TO_60", "FROM_60_TO_100", "OVER_100"].map((id) => ({ id, mediaId: null }));
}

function emptyLicenses() {
  return ["SALES", "ONLINE", "ENAMAD"].map((id) => ({ id, mediaId: null, href: null }));
}

// Resolves the seed's media *keys* (stable, human-readable labels that only exist within
// the seed data) into the real MediaAsset ids created for this run — those ids are only
// known once the rows are actually inserted, so this can't be computed ahead of time.
type ResolvedHomepageMedia = {
  heroContentMode: "WITH_CONTENT" | "IMAGE_ONLY";
  heroDesktopMediaId: string | null;
  heroSlides: Array<{ id: string; href: string; desktopMediaId: string | null; mobileMediaId: string | null }>;
  tileGroups: Array<{ id: string; layout: string; tiles: Array<{ id: string; href: string; mediaId: string | null }> }>;
  promoBannerEnabled: boolean;
  promoDesktopMediaId: string | null;
  promoMobileMediaId: string | null;
};

function resolveHomepageMedia(homepage: DevelopmentHomepageMediaSeed | undefined, resolveMediaId: (key: string | undefined) => string | null): ResolvedHomepageMedia {
  return {
    heroContentMode: homepage?.heroContentMode ?? "WITH_CONTENT",
    heroDesktopMediaId: resolveMediaId(homepage?.heroDesktopKey),
    heroSlides: (homepage?.heroSlides ?? []).map((slide) => ({ id: slide.id, href: slide.href, desktopMediaId: resolveMediaId(slide.desktopKey), mobileMediaId: resolveMediaId(slide.mobileKey) })),
    tileGroups: (homepage?.tileGroups ?? []).map((group) => ({ id: group.id, layout: group.layout, tiles: group.tiles.map((tile) => ({ id: tile.id, href: tile.href, mediaId: resolveMediaId(tile.key) })) })),
    promoBannerEnabled: homepage?.promoBannerEnabled ?? false,
    promoDesktopMediaId: resolveMediaId(homepage?.promoDesktopKey),
    promoMobileMediaId: resolveMediaId(homepage?.promoMobileKey),
  };
}

function generalHomepageSettings(menuItems: Array<{ id: string; label: string; href: string }>, resolvedMedia: ResolvedHomepageMedia) {
  return {
    sections: homepageSections(),
    menuItems,
    tileGroups: resolvedMedia.tileGroups,
    treasureCards: emptyTreasureCards(),
    licenses: emptyLicenses(),
    heroSlides: resolvedMedia.heroSlides,
    heroContentMode: resolvedMedia.heroContentMode,
    heroTitle: "خرید ساده، انتخاب مطمئن",
    heroDescription: "محصولات موردنیازتان را با قیمت شفاف، موجودی به‌روز و ارسال قابل پیگیری انتخاب کنید.",
    heroButtonLabel: "مشاهده محصولات",
    heroButtonHref: "/products",
    heroDesktopMediaId: resolvedMedia.heroDesktopMediaId,
    heroMobileMediaId: null,
    promoBannerEnabled: resolvedMedia.promoBannerEnabled,
    promoBannerHref: null,
    promoDesktopMediaId: resolvedMedia.promoDesktopMediaId,
    promoMobileMediaId: resolvedMedia.promoMobileMediaId,
  };
}

async function createStore(db: PrismaClient, seed: DevelopmentStoreSeed) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPhone = process.env.ADMIN_PHONE ?? "09120000000";
  await db.user.create({
    data: {
      email: adminEmail,
      phone: adminPhone,
      firstName: "مدیر",
      lastName: "فروشگاه",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await hash(process.env.ADMIN_PASSWORD ?? "ChangeMe123!", 12),
    },
  });

  // Media rows are created first so category/product/homepage slots below can reference the
  // real ids that only exist once these rows are actually inserted.
  const mediaIds = new Map<string, string>();
  for (const item of seed.media ?? []) {
    // upsert (not create) so a `keepGallery` reseed reuses the existing library row for this
    // storageKey and leaves its admin-set metadata (alt, caption, …) untouched; on a full
    // wipe the table is empty so this just creates the row.
    const created = await db.mediaAsset.upsert({
      where: { storageKey: item.storageKey },
      update: {},
      create: { type: item.type, scope: item.scope, url: item.url, storageKey: item.storageKey, title: item.title ?? null, mimeType: item.mimeType, sizeBytes: item.sizeBytes },
    });
    mediaIds.set(item.key, created.id);
  }
  function resolveMediaId(key: string | undefined): string | null {
    if (!key) return null;
    const id = mediaIds.get(key);
    if (!id) throw new Error(`Seed media key not found: ${key}`);
    return id;
  }

  const brandIds = new Map<string, string>();
  for (const [index, brand] of seed.brands.entries()) {
    const created = await db.brand.create({
      data: { name: brand.name, slug: brand.slug, logoId: resolveMediaId(brand.logoKey), isActive: true, featured: brand.featured ?? false, sortOrder: (index + 1) * 10 },
    });
    brandIds.set(brand.slug, created.id);
  }

  const categoryIds = new Map<string, string>();
  const rootMenuItems: Array<{ id: string; label: string; href: string }> = [];
  for (const [index, category] of seed.categories.entries()) {
    const parentId = category.parentSlug ? categoryIds.get(category.parentSlug) : undefined;
    if (category.parentSlug && !parentId) throw new Error(`Seed parent category not found: ${category.parentSlug}`);
    const created = await db.category.create({
      data: { name: category.name, slug: category.slug, description: category.description, parentId, imageId: resolveMediaId(category.imageKey), attributeSchema: category.attributeSchema ?? [], featured: !parentId, isActive: true, sortOrder: (index + 1) * 10 },
    });
    categoryIds.set(category.slug, created.id);
    if (!parentId) rootMenuItems.push({ id: `category-${created.id}`, label: created.name, href: `/products?category=${created.slug}` });
  }

  for (const product of seed.products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) throw new Error(`Seed category not found: ${product.categorySlug}`);
    const brandId = brandIds.get(product.brandSlug);
    if (!brandId) throw new Error(`Seed brand not found: ${product.brandSlug}`);
    const hasDiscount = Boolean(product.discountPercent);
    const created = await db.product.create({
      data: {
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: `<p>${product.description}</p>`,
        status: "ACTIVE",
        storeIndustry: seed.industry,
        categoryId,
        brandId,
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
    if (product.media?.length) {
      await db.productMedia.createMany({
        data: product.media.map((item, position) => ({ productId: created.id, mediaId: resolveMediaId(item.key)!, position, isCover: item.isCover ?? false })),
      });
    }
  }

  const brandLogoId = resolveMediaId(seed.brandLogoKey);
  const resolvedHomepageMedia = resolveHomepageMedia(seed.homepage, resolveMediaId);
  await db.storeSetting.create({
    data: {
      id: "main",
      industry: seed.industry,
      storeName: seed.storeName,
      tagline: seed.tagline,
      shortDescription: seed.shortDescription,
      menuCategoryIds: rootMenuItems,
      homepageSections: homepageSections(),
      homepageTreasureCards: emptyTreasureCards(),
      homepageLicenses: emptyLicenses(),
      homepageHeroSlides: [],
      generalHomepageSettings: seed.industry === "GENERAL" ? generalHomepageSettings(rootMenuItems, resolvedHomepageMedia) : undefined,
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
      mainLogoMediaId: brandLogoId,
      darkLogoMediaId: brandLogoId,
      faviconMediaId: brandLogoId,
      socialImageMediaId: brandLogoId,
    },
  });

  if (seed.industry === "GOLD") {
    await db.goldPrice.create({ data: { pricePerGram18: "48500000", source: "development-seed", fetchedAt: new Date() } });
  }

  const authorIds = new Map<string, string>();
  for (const author of seed.authors ?? []) {
    const created = await db.author.create({
      data: { name: author.name, bio: author.bio ?? null, avatarMediaId: resolveMediaId(author.avatarKey) },
    });
    authorIds.set(author.key, created.id);
  }

  const articleCategoryIds = new Map<string, string>();
  for (const [index, category] of (seed.articleCategories ?? []).entries()) {
    const created = await db.articleCategory.create({
      data: { name: category.name, slug: category.slug, isActive: true, sortOrder: (index + 1) * 10 },
    });
    articleCategoryIds.set(category.key, created.id);
  }

  for (const article of seed.articles ?? []) {
    const authorId = authorIds.get(article.authorKey);
    if (!authorId) throw new Error(`Seed article author not found: ${article.authorKey}`);
    const categoryId = articleCategoryIds.get(article.categoryKey);
    if (!categoryId) throw new Error(`Seed article category not found: ${article.categoryKey}`);
    await db.article.create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        coverMediaId: resolveMediaId(article.coverKey),
        authorId,
        categoryId,
        tags: article.tags ?? [],
        status: "PUBLISHED",
        publishedAt: new Date(article.publishedAt),
      },
    });
  }
}

export async function seedDevelopmentStore(industry: StoreIndustry, options: { keepGallery?: boolean } = {}) {
  assertDevelopmentDatabase();
  const keepGallery = options.keepGallery ?? false;
  const db = createClient();
  const seed = industry === "GOLD" ? goldStoreSeed : generalStoreSeed;
  try {
    await clearDevelopmentData(db, { keepGallery });
    await createStore(db, seed);
    // The wipe above clears packaging too; the store always has a default box, so put it back.
    await db.packagingBox.create({ data: { ...STANDARD_PACKAGING_BOX } });
    const [categoryCount, brandCount, productCount, productsWithoutBrand, industries, setting] = await Promise.all([
      db.category.count(),
      db.brand.count(),
      db.product.count(),
      db.product.count({ where: { brandId: null } }),
      db.product.groupBy({ by: ["storeIndustry"], _count: { _all: true } }),
      db.storeSetting.findUnique({ where: { id: "main" }, select: { industry: true } }),
    ]);
    if (categoryCount !== seed.categories.length || brandCount !== seed.brands.length || productCount !== seed.products.length || productsWithoutBrand > 0 || industries.length !== 1 || industries[0].storeIndustry !== industry || setting?.industry !== industry) {
      throw new Error("Development seed verification failed.");
    }
    console.info(`[seed] ${industry}${keepGallery ? " (gallery preserved)" : ""}: ${categoryCount} categories, ${brandCount} brands and ${productCount} products created.`);
  } finally {
    await db.$disconnect();
  }
}
