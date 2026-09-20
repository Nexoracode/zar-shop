import type { OrderStatus, VisitorDevice } from "../../generated/prisma/enums";
import type { PrismaClient } from "../../generated/prisma/client";
import { calculateDiscountedPrice } from "../../src/modules/products/discount";
import { isDefaultSelection } from "../../src/modules/products/variant-combinations";
import { assertDevelopmentDatabase, createClient } from "./seed-store";

// Everything this script writes is tagged so a re-run replaces it without touching real data:
// orders carry DEMO_NOTE, visitor ids start with DEMO_VISITOR_PREFIX (still valid 32-char hex),
// demo customers use a reserved phone range.
const DEMO_NOTE = "demo-seed";
const DEMO_VISITOR_PREFIX = "dead0000";
const DEMO_PHONE_BASE = 9_190_000_000; // 09190000000 …
const DEMO_DAYS = 60;

/** Small deterministic PRNG so a re-run draws the same dashboard, and screenshots stay comparable. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T>(random: () => number, options: Array<[T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [value, weight] of options) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return options[options.length - 1][0];
}

const BROWSERS: Array<[string, number]> = [["Chrome", 62], ["Safari", 17], ["Edge", 8], ["Firefox", 6], ["Samsung Internet", 4], ["Opera", 2], ["Other", 1]];
const DEVICES: Array<[VisitorDevice, number]> = [["MOBILE", 57], ["DESKTOP", 38], ["TABLET", 5]];
const SOURCES: Array<[string | null, number]> = [[null, 52], ["google.com", 23], ["instagram.com", 10], ["t.me", 7], ["bing.com", 3], ["aparat.com", 3], ["digikala.com", 2]];
const FALLBACK_PROVINCES: Array<[string, number]> = [["تهران", 30], ["اصفهان", 12], ["خراسان رضوی", 11], ["فارس", 9], ["آذربایجان شرقی", 8], ["البرز", 7], ["خوزستان", 6], ["مازندران", 6], ["گیلان", 5], ["کرمان", 3], ["قم", 3]];
const STATUSES: Array<[OrderStatus, number]> = [["DELIVERED", 44], ["SHIPPED", 16], ["PROCESSING", 11], ["PAID", 10], ["PENDING_PAYMENT", 9], ["CANCELLED", 6]];
const PAID_STATUSES = new Set<OrderStatus>(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);

function dayStart(daysAgo: number, now: Date) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function seedTraffic(db: PrismaClient, slugs: string[], now: Date, random: () => number) {
  await db.pageView.deleteMany({ where: { visitorId: { startsWith: DEMO_VISITOR_PREFIX } } });
  await db.visitorPresence.deleteMany({ where: { visitorId: { startsWith: DEMO_VISITOR_PREFIX } } });

  const pool = Array.from({ length: 320 }, (_, index) => `${DEMO_VISITOR_PREFIX}${index.toString(16).padStart(24, "0")}`);
  const paths = ["/", "/products", "/products", "/cart", "/blog", ...slugs.map((slug) => `/products/${slug}`)];
  const rows: Array<{ visitorId: string; path: string; referrerHost: string | null; browser: string; device: VisitorDevice; createdAt: Date }> = [];

  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const start = dayStart(daysAgo, now);
    const weekday = start.getDay(); // Friday (5) and Thursday (4) are the quiet days here.
    const rhythm = weekday === 5 ? 0.62 : weekday === 4 ? 0.85 : 1.05;
    const trend = 0.75 + ((29 - daysAgo) / 29) * 0.5; // traffic grows across the month
    const spike = daysAgo === 8 ? 2.1 : 1;
    let views = Math.round(150 * rhythm * trend * spike * (0.85 + random() * 0.3));
    let horizon = 24 * 3_600_000;
    if (daysAgo === 0) {
      horizon = Math.max(3_600_000, now.getTime() - start.getTime());
      views = Math.round(views * (horizon / (24 * 3_600_000)));
    }
    // A visitor's device and browser stay the same across their views.
    for (let index = 0; index < views; index += 1) {
      const slot = Math.floor(Math.pow(random(), 1.8) * pool.length);
      const visitorId = pool[slot];
      // Drawn in a fixed order from a generator seeded by the visitor, so the same visitor
      // always shows up with the same source, browser and device.
      const fingerprint = mulberry32(slot + 7);
      const source = weighted(fingerprint, SOURCES);
      const browser = weighted(fingerprint, BROWSERS);
      const device = weighted(fingerprint, DEVICES);
      // Evenings are busiest: draw the hour from a curve skewed towards 19–23.
      const hourFraction = Math.min(0.999, Math.max(0, 0.72 + (random() - 0.5) * 0.7 * (random() < 0.3 ? 1.6 : 1)));
      const createdAt = new Date(start.getTime() + Math.min(horizon - 1, hourFraction * 24 * 3_600_000));
      if (createdAt > now) continue;
      rows.push({
        visitorId,
        path: paths[Math.floor(random() * paths.length)],
        referrerHost: random() < 0.35 ? source : null,
        browser,
        device,
        createdAt,
      });
    }
  }

  for (let offset = 0; offset < rows.length; offset += 1000) {
    await db.pageView.createMany({ data: rows.slice(offset, offset + 1000) });
  }
  for (let index = 0; index < 7; index += 1) {
    await db.visitorPresence.create({ data: { visitorId: `${DEMO_VISITOR_PREFIX}${(400 + index).toString(16).padStart(24, "0")}`, lastSeenAt: new Date(now.getTime() - Math.floor(random() * 4 * 60_000)) } });
  }
  return rows.length;
}

async function seedOrders(db: PrismaClient, now: Date, random: () => number) {
  await db.payment.deleteMany({ where: { order: { notes: DEMO_NOTE } } });
  await db.order.deleteMany({ where: { notes: DEMO_NOTE } });

  // What is sold is a variant, so a line is drawn from a product's sellable combinations and takes that
  // combination's price and discount — the same figures a real order snapshots.
  const products = await db.product.findMany({
    where: { status: "ACTIVE", variants: { some: { isActive: true } } },
    select: { id: true, sku: true, name: true, storeIndustry: true, purity: true, weightGrams: true, variants: { where: { isActive: true }, select: { selectionKey: true, selection: true, price: true, discountType: true, discountValue: true, discountStartsAt: true, discountEndsAt: true } } },
    take: 40,
  });
  if (!products.length) return 0;
  const provinceRows = await db.province.findMany({ select: { name: true } });
  const provinces: Array<[string, number]> = provinceRows.length >= 8
    ? FALLBACK_PROVINCES.filter(([name]) => provinceRows.some((row) => row.name === name)).concat(provinceRows.filter((row) => !FALLBACK_PROVINCES.some(([name]) => name === row.name)).slice(0, 6).map((row): [string, number] => [row.name, 1.5]))
    : FALLBACK_PROVINCES;

  const customers = [];
  for (let index = 0; index < 26; index += 1) {
    const phone = `0${DEMO_PHONE_BASE + index}`;
    const createdAt = new Date(now.getTime() - Math.floor(random() * 28) * 86_400_000);
    customers.push(await db.user.upsert({
      where: { phone },
      update: {},
      create: { phone, email: `demo-customer-${index + 1}@example.com`, firstName: ["علی", "سارا", "رضا", "مینا", "امیر", "نگار", "حسین", "الهام"][index % 8], lastName: ["احمدی", "کریمی", "رحیمی", "موسوی", "حسینی", "صادقی"][index % 6], role: "CUSTOMER", status: "ACTIVE", createdAt },
      select: { id: true, firstName: true, lastName: true, phone: true },
    }));
  }

  let created = 0;
  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const start = dayStart(daysAgo, now);
    const growth = 0.7 + ((DEMO_DAYS - 1 - daysAgo) / (DEMO_DAYS - 1)) * 0.6;
    const count = daysAgo === 0 ? 4 : Math.round(1.7 * growth * (0.5 + random() * 1.1));
    for (let index = 0; index < count; index += 1) {
      const customer = customers[Math.floor(random() * customers.length)];
      const status = weighted(random, STATUSES);
      const createdAt = new Date(Math.min(now.getTime() - 60_000, start.getTime() + (9 + random() * 13) * 3_600_000));
      const lines = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
        const product = products[Math.floor(random() * products.length)];
        const variant = product.variants[Math.floor(random() * product.variants.length)];
        const originalUnitPrice = Number(variant.price ?? 0) || (600_000 + Math.floor(random() * 90) * 100_000);
        // The discount as it stood when the order was placed, not today's.
        const { finalPrice, discountAmount } = calculateDiscountedPrice(originalUnitPrice, variant, createdAt);
        const quantity = 1 + Math.floor(random() * 2);
        return { product, variant, originalUnitPrice, discountAmount, unitPrice: finalPrice, quantity, total: finalPrice * quantity };
      });
      // Same arithmetic as a real order: the subtotal is at full price, the product discount comes off
      // it, and shipping is charged on what the customer actually pays for the goods.
      const subtotal = lines.reduce((sum, line) => sum + line.originalUnitPrice * line.quantity, 0);
      const productDiscount = lines.reduce((sum, line) => sum + line.discountAmount * line.quantity, 0);
      const merchandise = subtotal - productDiscount;
      const shipping = merchandise > 5_000_000 ? 0 : 450_000;
      const total = merchandise + shipping;
      const order = await db.order.create({
        data: {
          orderNumber: `DEMO-${String(DEMO_DAYS - daysAgo).padStart(2, "0")}${index}-${customer.id.slice(-4).toUpperCase()}`,
          userId: customer.id,
          status,
          createdAt,
          notes: DEMO_NOTE,
          goldPriceSnapshot: 0,
          subtotal,
          productDiscount,
          discount: productDiscount,
          shipping,
          total,
          shippingAddress: { fullName: `${customer.firstName} ${customer.lastName}`, phone: customer.phone, province: weighted(random, provinces), city: "—", address: "نشانی نمونه" },
          items: {
            create: lines.map((line) => ({
              productId: line.product.id, sku: line.product.sku, name: line.product.name, storeIndustry: line.product.storeIndustry, quantity: line.quantity,
              // The default variant names no option, so its line carries no selection.
              selectionKey: line.variant.selectionKey, ...(isDefaultSelection(line.variant.selection) ? {} : { selectedOptions: line.variant.selection as Record<string, string> }),
              weightGrams: line.product.weightGrams, purity: line.product.purity, makingFee: 0, profit: 0, tax: 0,
              originalUnitPrice: line.originalUnitPrice, discountAmount: line.discountAmount, unitPrice: line.unitPrice, total: line.total,
            })),
          },
        },
        select: { id: true },
      });
      if (PAID_STATUSES.has(status)) {
        const provider = weighted(random, [["zarinpal", 78], ["wallet", 22]] as Array<[string, number]>);
        await db.payment.create({ data: { orderId: order.id, provider, amount: total, status: "SUCCESS", paidAt: new Date(createdAt.getTime() + 120_000), createdAt, referenceId: `DEMO-${order.id}` } });
      }
      created += 1;
    }
  }
  return created;
}

/**
 * Optional development-only data for demoing the admin dashboard on an otherwise empty store:
 * a month of storefront traffic, online visitors, and ~two months of orders with payments.
 * It adds to the current database instead of resetting it, and replaces only its own earlier rows.
 *
 * It refuses anything but a local development database unless `allowRemote` is set, which only the
 * hosted-demo build (prisma/seed-vercel.ts) does, and only when its deployment asks for it.
 */
export async function seedDemoAnalytics(options: { allowRemote?: boolean } = {}) {
  if (!options.allowRemote) assertDevelopmentDatabase();
  const db = createClient();
  const now = new Date();
  const random = mulberry32(20260919);
  try {
    const slugs = (await db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true }, take: 25 })).map((product) => product.slug);
    const views = await seedTraffic(db, slugs, now, random);
    const orders = await seedOrders(db, now, random);
    console.info(`[seed:demo] ${views} page views and ${orders} orders created.${orders === 0 ? " (No active products found — run db:seed:general first to get demo orders.)" : ""}`);
  } finally {
    await db.$disconnect();
  }
}
