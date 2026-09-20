import type { PrismaClient } from "../../generated/prisma/client";
import { syncProductMirror } from "../../src/modules/products/variant-write";
import { buildCombinations, type VariantSelection } from "../../src/modules/products/variant-combinations";
import { variantSelectionKey } from "../../src/modules/products/variants";

// Sample catalogue for demoing variants: the shared colour and option libraries, and a handful of
// products sold by colour and size. Everything is written the way the admin form would write it
// (library types and values, one row per combination, the product's mirror synced afterwards).
// Products carry DEMO_SKU_PREFIX so a re-run replaces exactly these and nothing else; the colour
// and option libraries are reused by name, so the admin's own entries are never touched.
export const DEMO_SKU_PREFIX = "DEMO-VAR-";

const DAY = 86_400_000;

const DEMO_COLORS = [
  { name: "مشکی", hex: "#111827" },
  { name: "سفید", hex: "#FFFFFF" },
  { name: "طوسی", hex: "#9CA3AF" },
  { name: "آبی", hex: "#2563EB" },
  { name: "قرمز", hex: "#DC2626" },
  { name: "سبز", hex: "#16A34A" },
  { name: "زرد", hex: "#FACC15" },
  { name: "نارنجی", hex: "#F97316" },
] as const;

// «رنگ» is the one COLOR type: its values are the colours above, so a colour is never named twice.
const COLOR_TYPE = "رنگ";
const DEMO_SELECT_TYPES = [
  { name: "سایز", values: ["S", "M", "L", "XL", "XXL"] },
  { name: "شماره کفش", values: ["۳۹", "۴۰", "۴۱", "۴۲", "۴۳", "۴۴"] },
  { name: "حافظه", values: ["۶۴ گیگابایت", "۱۲۸ گیگابایت", "۲۵۶ گیگابایت", "۵۱۲ گیگابایت", "۱ ترابایت"] },
  { name: "جنس", values: ["استیل", "آلومینیوم", "پلاستیک مقاوم", "شیشه", "سرامیک"] },
] as const;

type DiscountSpec = { match: VariantSelection; percent: number; window: "running" | "open" | "upcoming" };

type DemoProductSpec = {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  brandSlug: string;
  description: string;
  /** Base price in rials; a combination adds the surcharge of each value it is made of. */
  price: number;
  types: Array<{ type: string; values: string[] }>;
  /** Percent added to a combination's price for a value, keyed by that value's label. */
  surcharge?: Record<string, number>;
  discounts?: DiscountSpec[];
  soldOut?: VariantSelection[];
  switchedOff?: VariantSelection[];
};

const SIZES_CLOTHING = ["S", "M", "L", "XL", "XXL"];

const DEMO_PRODUCTS: DemoProductSpec[] = [
  {
    sku: `${DEMO_SKU_PREFIX}001`, name: "تی‌شرت نخی یقه گرد", slug: "demo-round-neck-cotton-tshirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "تی‌شرت نخی ۱۰۰٪ با دوخت مقاوم و پارچه نرم، مناسب استفاده روزمره.",
    price: 9_800_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "سفید", "طوسی", "آبی", "قرمز"] }, { type: "سایز", values: SIZES_CLOTHING.slice(0, 4) }],
    surcharge: { XL: 6, XXL: 12 },
    discounts: [{ match: { "رنگ": "قرمز" }, percent: 15, window: "running" }, { match: { "رنگ": "مشکی", "سایز": "XL" }, percent: 25, window: "open" }],
    soldOut: [{ "رنگ": "سفید", "سایز": "S" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}002`, name: "پیراهن کتان مردانه", slug: "demo-linen-shirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "پیراهن کتان سبک و خنک با یقه کلاسیک و دکمه‌های ماندگار.",
    price: 18_500_000,
    types: [{ type: COLOR_TYPE, values: ["سفید", "آبی", "طوسی", "مشکی", "سبز"] }, { type: "سایز", values: SIZES_CLOTHING.slice(1) }],
    surcharge: { XXL: 8 },
    discounts: [{ match: { "رنگ": "آبی", "سایز": "L" }, percent: 20, window: "upcoming" }],
    switchedOff: [{ "رنگ": "سبز", "سایز": "XXL" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}003`, name: "سویشرت کلاه‌دار زمستانی", slug: "demo-winter-hooded-sweatshirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "سویشرت کلاه‌دار با آستر پشمی نرم و جیب کانگورویی.",
    price: 32_000_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "طوسی", "آبی", "قرمز", "سبز", "نارنجی"] }, { type: "سایز", values: SIZES_CLOTHING }],
    surcharge: { XL: 5, XXL: 10 },
    discounts: [{ match: { "رنگ": "نارنجی" }, percent: 30, window: "running" }, { match: { "رنگ": "طوسی" }, percent: 12, window: "open" }],
    soldOut: [{ "رنگ": "قرمز", "سایز": "S" }, { "رنگ": "قرمز", "سایز": "M" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}004`, name: "کفش کتانی پیاده‌روی", slug: "demo-walking-sneakers", categorySlug: "sport-travel", brandSlug: "kouhpeyma",
    description: "کفش سبک با زیره ضدلغزش و کفی طبی، مناسب پیاده‌روی و باشگاه.",
    price: 46_500_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "سفید", "آبی", "نارنجی", "طوسی"] }, { type: "شماره کفش", values: ["۳۹", "۴۰", "۴۱", "۴۲", "۴۳", "۴۴"] }],
    surcharge: { "۴۴": 4 },
    discounts: [{ match: { "رنگ": "سفید" }, percent: 18, window: "running" }],
    soldOut: [{ "رنگ": "نارنجی", "شماره کفش": "۴۰" }, { "رنگ": "نارنجی", "شماره کفش": "۴۱" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}005`, name: "کوله‌پشتی مسافرتی ضدآب", slug: "demo-waterproof-travel-backpack", categorySlug: "sport-travel", brandSlug: "kouhpeyma",
    description: "کوله ضدآب با کمربند کمری و جیب لپ‌تاپ، مناسب سفرهای کوتاه.",
    price: 41_000_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "سبز", "آبی", "طوسی", "نارنجی"] }, { type: "سایز", values: ["S", "M", "L"] }],
    surcharge: { M: 15, L: 32 },
    discounts: [{ match: { "رنگ": "سبز", "سایز": "L" }, percent: 10, window: "open" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}006`, name: "حافظه SSD قابل حمل", slug: "demo-portable-ssd", categorySlug: "digital-products", brandSlug: "keytech",
    description: "حافظه اس‌اس‌دی خارجی با سرعت بالا و بدنه ضدضربه.",
    price: 38_000_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "آبی", "قرمز", "سفید", "طوسی"] }, { type: "حافظه", values: ["۱۲۸ گیگابایت", "۲۵۶ گیگابایت", "۵۱۲ گیگابایت", "۱ ترابایت"] }],
    surcharge: { "۲۵۶ گیگابایت": 45, "۵۱۲ گیگابایت": 130, "۱ ترابایت": 280 },
    discounts: [{ match: { "حافظه": "۱ ترابایت" }, percent: 8, window: "running" }],
    soldOut: [{ "رنگ": "قرمز", "حافظه": "۱ ترابایت" }],
  },
  {
    sku: `${DEMO_SKU_PREFIX}007`, name: "قمقمه نگه‌دار دما", slug: "demo-insulated-bottle", categorySlug: "home-kitchen", brandSlug: "khaneara",
    description: "قمقمه دوجداره که نوشیدنی را تا ۱۲ ساعت گرم یا سرد نگه می‌دارد.",
    price: 14_200_000,
    types: [{ type: COLOR_TYPE, values: ["مشکی", "سفید", "آبی", "سبز", "زرد"] }, { type: "جنس", values: ["استیل", "آلومینیوم", "پلاستیک مقاوم"] }],
    surcharge: { "استیل": 20, "آلومینیوم": 8 },
    discounts: [{ match: { "رنگ": "زرد" }, percent: 22, window: "upcoming" }, { match: { "جنس": "پلاستیک مقاوم" }, percent: 12, window: "running" }],
  },
];

/** The colour and option libraries: created if missing, matched by name if not. Returns type name → its value labels → value id. */
async function ensureLibraries(db: PrismaClient) {
  const colorIds = new Map<string, string>();
  for (const [index, color] of DEMO_COLORS.entries()) {
    const row = await db.color.upsert({ where: { name: color.name }, update: {}, create: { name: color.name, hex: color.hex, sortOrder: (index + 1) * 10 } });
    colorIds.set(color.name, row.id);
  }

  const values = new Map<string, Map<string, string>>();
  const ensureType = async (name: string, kind: "COLOR" | "SELECT", sortOrder: number, labels: readonly string[]) => {
    const type = await db.optionType.upsert({ where: { name }, update: {}, create: { name, kind, sortOrder } });
    const byLabel = new Map<string, string>();
    for (const [index, label] of labels.entries()) {
      const row = await db.optionValue.upsert({
        where: { typeId_label: { typeId: type.id, label } },
        update: {},
        create: { typeId: type.id, label, colorId: kind === "COLOR" ? colorIds.get(label) ?? null : null, sortOrder: (index + 1) * 10 },
      });
      byLabel.set(label, row.id);
    }
    values.set(name, byLabel);
    return type.id;
  };

  const typeIds = new Map<string, string>();
  typeIds.set(COLOR_TYPE, await ensureType(COLOR_TYPE, "COLOR", 10, DEMO_COLORS.map((color) => color.name)));
  for (const [index, type] of DEMO_SELECT_TYPES.entries()) typeIds.set(type.name, await ensureType(type.name, "SELECT", (index + 2) * 10, type.values));
  return { typeIds, values, colorCount: DEMO_COLORS.length, typeCount: typeIds.size };
}

function matches(selection: VariantSelection, partial: VariantSelection) {
  return Object.entries(partial).every(([name, value]) => selection[name] === value);
}

function discountFor(spec: DemoProductSpec, selection: VariantSelection, now: Date) {
  const discount = spec.discounts?.find((entry) => matches(selection, entry.match));
  if (!discount) return { discountType: null, discountValue: null, discountStartsAt: null, discountEndsAt: null };
  const window = {
    // Running now with an end date, so the "ends on …" line has something to show.
    running: [new Date(now.getTime() - 6 * DAY), new Date(now.getTime() + 21 * DAY)],
    // A standing special sale: no window at all.
    open: [null, null],
    // Scheduled: appears under "upcoming" until it opens.
    upcoming: [new Date(now.getTime() + 4 * DAY), new Date(now.getTime() + 18 * DAY)],
  }[discount.window];
  return { discountType: "PERCENT" as const, discountValue: String(discount.percent), discountStartsAt: window[0], discountEndsAt: window[1] };
}

export async function seedDemoCatalog(db: PrismaClient, now: Date, random: () => number) {
  const setting = await db.storeSetting.findUnique({ where: { id: "main" }, select: { industry: true } });
  if (setting?.industry !== "GENERAL") return { colors: 0, types: 0, products: 0, variants: 0, skipped: "the store is not a general shop" };

  const { typeIds, values, colorCount, typeCount } = await ensureLibraries(db);

  await db.product.deleteMany({ where: { sku: { startsWith: DEMO_SKU_PREFIX } } });

  const [categories, brands, photos] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true } }),
    db.brand.findMany({ select: { id: true, slug: true } }),
    db.mediaAsset.findMany({ where: { scope: "PRODUCT", type: "IMAGE" }, orderBy: { createdAt: "asc" }, select: { id: true }, take: 24 }),
  ]);
  const categoryId = new Map(categories.map((row) => [row.slug, row.id]));
  const brandId = new Map(brands.map((row) => [row.slug, row.id]));

  let variantCount = 0;
  let productCount = 0;
  for (const [index, spec] of DEMO_PRODUCTS.entries()) {
    const category = categoryId.get(spec.categorySlug);
    const brand = brandId.get(spec.brandSlug);
    if (!category || !brand) continue; // a store without these categories/brands just skips the product

    const combinations = buildCombinations(spec.types.map((entry) => ({ typeName: entry.type, values: entry.values })));
    const product = await db.product.create({
      data: {
        sku: spec.sku, name: spec.name, slug: spec.slug, description: `<p>${spec.description}</p>`, status: "ACTIVE", storeIndustry: "GENERAL",
        categoryId: category, brandId: brand, purity: 0, weightGrams: "0", makingFeeType: "PERCENT", makingFeeValue: "0", profitPercent: "0", taxPercent: "0",
        fixedPrice: String(spec.price), stock: 0, preparationDays: 2, attributes: [],
      },
      select: { id: true },
    });

    await db.productOptionType.createMany({ data: spec.types.map((entry, position) => ({ productId: product.id, typeId: typeIds.get(entry.type)!, position })) });
    await db.productOptionValue.createMany({
      data: spec.types.flatMap((entry) => entry.values.map((label, position) => ({
        productId: product.id, typeId: typeIds.get(entry.type)!, valueId: values.get(entry.type)!.get(label)!, position,
      }))),
    });

    await db.productVariant.createMany({
      data: combinations.map((selection) => {
        const surcharge = Object.values(selection).reduce((sum, label) => sum + (spec.surcharge?.[label] ?? 0), 0);
        const soldOut = spec.soldOut?.some((entry) => matches(selection, entry)) ?? false;
        return {
          productId: product.id,
          selectionKey: variantSelectionKey(selection),
          selection,
          price: String(Math.round(spec.price * (1 + surcharge / 100) / 10_000) * 10_000),
          ...discountFor(spec, selection, now),
          stock: soldOut ? 0 : 2 + Math.floor(random() * 24),
          preparationDays: 2,
          minOrderQuantity: 1,
          maxOrderQuantity: null,
          isActive: !(spec.switchedOff?.some((entry) => matches(selection, entry)) ?? false),
        };
      }),
    });
    variantCount += combinations.length;

    // Two or three photos from the existing product library, shifted per product so cards differ.
    if (photos.length) {
      const chosen = [...new Set([0, 1, 2].map((offset) => photos[(index * 2 + offset) % photos.length].id))];
      await db.productMedia.createMany({ data: chosen.map((mediaId, position) => ({ productId: product.id, mediaId, position, isCover: position === 0 })) });
    }

    await syncProductMirror(db, product.id);
    productCount += 1;
  }
  return { colors: colorCount, types: typeCount, products: productCount, variants: variantCount, skipped: null };
}
