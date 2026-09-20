import type { DevelopmentColorSeed, DevelopmentOptionTypeSeed, DevelopmentVariantProductSeed } from "./types";

// The general store's variation data: the shared colour and option libraries, and seven products
// sold by colour and size (or shoe size, storage, material) — 150 combinations in all. It exercises
// every state the admin and the storefront show: a discount running with an end date, a standing
// sale with no window, a scheduled one, sold-out combinations and one switched off.

export const generalColorSeed: DevelopmentColorSeed[] = [
  { name: "مشکی", hex: "#111827" },
  { name: "سفید", hex: "#FFFFFF" },
  { name: "طوسی", hex: "#9CA3AF" },
  { name: "آبی", hex: "#2563EB" },
  { name: "قرمز", hex: "#DC2626" },
  { name: "سبز", hex: "#16A34A" },
  { name: "زرد", hex: "#FACC15" },
  { name: "نارنجی", hex: "#F97316" },
];

// «رنگ» is the one COLOR type: its values are the colours above, so a colour is never named twice.
export const generalOptionTypeSeed: DevelopmentOptionTypeSeed[] = [
  { name: "رنگ", kind: "COLOR", values: generalColorSeed.map((color) => color.name) },
  { name: "سایز", kind: "SELECT", values: ["S", "M", "L", "XL", "XXL"] },
  { name: "شماره کفش", kind: "SELECT", values: ["۳۹", "۴۰", "۴۱", "۴۲", "۴۳", "۴۴"] },
  { name: "حافظه", kind: "SELECT", values: ["۶۴ گیگابایت", "۱۲۸ گیگابایت", "۲۵۶ گیگابایت", "۵۱۲ گیگابایت", "۱ ترابایت"] },
  { name: "جنس", kind: "SELECT", values: ["استیل", "آلومینیوم", "پلاستیک مقاوم", "شیشه", "سرامیک"] },
];

export const generalVariantProductSeed: DevelopmentVariantProductSeed[] = [
  {
    sku: "DEV-GEN-014", name: "تی‌شرت نخی یقه گرد", slug: "round-neck-cotton-tshirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "تی‌شرت نخی ۱۰۰٪ با دوخت مقاوم و پارچه نرم، مناسب استفاده روزمره.",
    price: 9_800_000,
    types: [{ type: "رنگ", values: ["مشکی", "سفید", "طوسی", "آبی", "قرمز"] }, { type: "سایز", values: ["S", "M", "L", "XL"] }],
    surcharge: { XL: 6 },
    discounts: [{ match: { "رنگ": "قرمز" }, percent: 15, window: "running" }, { match: { "رنگ": "مشکی", "سایز": "XL" }, percent: 25, window: "open" }],
    soldOut: [{ "رنگ": "سفید", "سایز": "S" }],
    media: [{ key: "product-media-01", isCover: true }, { key: "product-media-02" }, { key: "product-media-07" }],
  },
  {
    sku: "DEV-GEN-015", name: "پیراهن کتان مردانه", slug: "linen-shirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "پیراهن کتان سبک و خنک با یقه کلاسیک و دکمه‌های ماندگار.",
    price: 18_500_000,
    types: [{ type: "رنگ", values: ["سفید", "آبی", "طوسی", "مشکی", "سبز"] }, { type: "سایز", values: ["M", "L", "XL", "XXL"] }],
    surcharge: { XXL: 8 },
    discounts: [{ match: { "رنگ": "آبی", "سایز": "L" }, percent: 20, window: "upcoming" }],
    switchedOff: [{ "رنگ": "سبز", "سایز": "XXL" }],
    media: [{ key: "product-media-13", isCover: true }, { key: "product-media-07" }, { key: "product-media-02" }],
  },
  {
    sku: "DEV-GEN-016", name: "سویشرت کلاه‌دار زمستانی", slug: "winter-hooded-sweatshirt", categorySlug: "fashion-clothing", brandSlug: "styleline",
    description: "سویشرت کلاه‌دار با آستر پشمی نرم و جیب کانگورویی.",
    price: 32_000_000,
    types: [{ type: "رنگ", values: ["مشکی", "طوسی", "آبی", "قرمز", "سبز", "نارنجی"] }, { type: "سایز", values: ["S", "M", "L", "XL", "XXL"] }],
    surcharge: { XL: 5, XXL: 10 },
    discounts: [{ match: { "رنگ": "نارنجی" }, percent: 30, window: "running" }, { match: { "رنگ": "طوسی" }, percent: 12, window: "open" }],
    soldOut: [{ "رنگ": "قرمز", "سایز": "S" }, { "رنگ": "قرمز", "سایز": "M" }],
    media: [{ key: "product-media-02", isCover: true }, { key: "product-media-01" }, { key: "product-media-13" }],
  },
  {
    sku: "DEV-GEN-017", name: "کفش کتانی پیاده‌روی", slug: "walking-sneakers", categorySlug: "sport-travel", brandSlug: "kouhpeyma",
    description: "کفش سبک با زیره ضدلغزش و کفی طبی، مناسب پیاده‌روی و باشگاه.",
    price: 46_500_000,
    types: [{ type: "رنگ", values: ["مشکی", "سفید", "آبی", "نارنجی", "طوسی"] }, { type: "شماره کفش", values: ["۳۹", "۴۰", "۴۱", "۴۲", "۴۳", "۴۴"] }],
    surcharge: { "۴۴": 4 },
    discounts: [{ match: { "رنگ": "سفید" }, percent: 18, window: "running" }],
    soldOut: [{ "رنگ": "نارنجی", "شماره کفش": "۴۰" }, { "رنگ": "نارنجی", "شماره کفش": "۴۱" }],
    media: [{ key: "product-media-10", isCover: true }, { key: "product-media-11" }, { key: "product-media-09" }],
  },
  {
    sku: "DEV-GEN-018", name: "کوله‌پشتی مسافرتی ضدآب", slug: "waterproof-travel-backpack", categorySlug: "sport-travel", brandSlug: "kouhpeyma",
    description: "کوله ضدآب با کمربند کمری و جیب لپ‌تاپ، مناسب سفرهای کوتاه.",
    price: 41_000_000,
    types: [{ type: "رنگ", values: ["مشکی", "سبز", "آبی", "طوسی", "نارنجی"] }, { type: "سایز", values: ["S", "M", "L"] }],
    surcharge: { M: 15, L: 32 },
    discounts: [{ match: { "رنگ": "سبز", "سایز": "L" }, percent: 10, window: "open" }],
    media: [{ key: "product-media-11", isCover: true }, { key: "product-media-10" }, { key: "product-media-09" }],
  },
  {
    sku: "DEV-GEN-019", name: "حافظه SSD قابل حمل", slug: "portable-ssd", categorySlug: "digital-products", brandSlug: "keytech",
    description: "حافظه اس‌اس‌دی خارجی با سرعت بالا و بدنه ضدضربه.",
    price: 38_000_000,
    types: [{ type: "رنگ", values: ["مشکی", "آبی", "قرمز", "سفید", "طوسی"] }, { type: "حافظه", values: ["۱۲۸ گیگابایت", "۲۵۶ گیگابایت", "۵۱۲ گیگابایت", "۱ ترابایت"] }],
    surcharge: { "۲۵۶ گیگابایت": 45, "۵۱۲ گیگابایت": 130, "۱ ترابایت": 280 },
    discounts: [{ match: { "حافظه": "۱ ترابایت" }, percent: 8, window: "running" }],
    soldOut: [{ "رنگ": "قرمز", "حافظه": "۱ ترابایت" }],
    media: [{ key: "product-media-16", isCover: true }, { key: "product-media-15" }, { key: "product-media-08" }],
  },
  {
    sku: "DEV-GEN-020", name: "قمقمه نگه‌دار دما", slug: "insulated-bottle", categorySlug: "home-kitchen", brandSlug: "khaneara",
    description: "قمقمه دوجداره که نوشیدنی را تا ۱۲ ساعت گرم یا سرد نگه می‌دارد.",
    price: 14_200_000,
    types: [{ type: "رنگ", values: ["مشکی", "سفید", "آبی", "سبز", "زرد"] }, { type: "جنس", values: ["استیل", "آلومینیوم", "پلاستیک مقاوم"] }],
    surcharge: { "استیل": 20, "آلومینیوم": 8 },
    discounts: [{ match: { "رنگ": "زرد" }, percent: 22, window: "upcoming" }, { match: { "جنس": "پلاستیک مقاوم" }, percent: 12, window: "running" }],
    media: [{ key: "product-media-09", isCover: true }, { key: "product-media-06" }, { key: "product-media-03" }],
  },
];
