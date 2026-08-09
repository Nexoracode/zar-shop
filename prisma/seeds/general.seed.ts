import type { DevelopmentStoreSeed } from "./types";

export const generalStoreSeed: DevelopmentStoreSeed = {
  industry: "GENERAL",
  storeName: "فروشگاه توسعه",
  tagline: "انتخاب بهتر برای زندگی روزمره",
  shortDescription: "فروشگاه آزمایشی محصولات عمومی با قیمت ثابت، موجودی و تخفیف زمان‌دار",
  categories: [
    { name: "کالای دیجیتال", slug: "digital-products", description: "لوازم دیجیتال و جانبی پرکاربرد" },
    { name: "خانه و آشپزخانه", slug: "home-kitchen", description: "محصولات کاربردی خانه و آشپزخانه" },
    { name: "مد و پوشاک", slug: "fashion-clothing", description: "پوشاک و اکسسوری روزمره" },
    { name: "ورزش و سفر", slug: "sport-travel", description: "لوازم ورزشی، کمپ و سفر" },
    { name: "زیبایی و سلامت", slug: "beauty-health", description: "محصولات مراقبت شخصی و سلامت" },
  ],
  products: [
    { sku: "DEV-GEN-001", name: "هدفون بی‌سیم نوا", slug: "nova-wireless-headphones", categorySlug: "digital-products", description: "هدفون بی‌سیم سبک با شارژدهی مناسب استفاده روزمره.", stock: 18, fixedPrice: "32900000", discountPercent: "10", featured: true },
    { sku: "DEV-GEN-002", name: "پاوربانک ۲۰ هزار آمپر", slug: "20000mah-power-bank", categorySlug: "digital-products", description: "پاوربانک دو خروجی با نمایشگر میزان شارژ.", stock: 11, fixedPrice: "24800000", featured: true },
    { sku: "DEV-GEN-003", name: "کیبورد مکانیکی مینی", slug: "mini-mechanical-keyboard", categorySlug: "digital-products", description: "کیبورد مکانیکی جمع‌وجور مناسب کار و بازی.", stock: 7, fixedPrice: "45900000" },
    { sku: "DEV-GEN-004", name: "ماگ حرارتی سرامیکی", slug: "ceramic-thermal-mug", categorySlug: "home-kitchen", description: "ماگ سرامیکی دوجداره مناسب نوشیدنی گرم.", stock: 24, fixedPrice: "8900000", discountPercent: "15", featured: true },
    { sku: "DEV-GEN-005", name: "ترازو آشپزخانه دیجیتال", slug: "digital-kitchen-scale", categorySlug: "home-kitchen", description: "ترازوی دقیق آشپزخانه با واحدهای اندازه‌گیری متنوع.", stock: 13, fixedPrice: "12700000" },
    { sku: "DEV-GEN-006", name: "چراغ مطالعه تاشو", slug: "foldable-desk-lamp", categorySlug: "home-kitchen", description: "چراغ مطالعه LED با نور قابل تنظیم.", stock: 9, fixedPrice: "16500000", featured: true },
    { sku: "DEV-GEN-007", name: "هودی پنبه‌ای ساده", slug: "basic-cotton-hoodie", categorySlug: "fashion-clothing", description: "هودی پنبه‌ای راحت با دوخت مقاوم.", stock: 16, fixedPrice: "29800000", discountPercent: "20" },
    { sku: "DEV-GEN-008", name: "کیف دوشی مینیمال", slug: "minimal-shoulder-bag", categorySlug: "fashion-clothing", description: "کیف دوشی سبک با فضای مناسب وسایل روزمره.", stock: 8, fixedPrice: "21900000", featured: true },
    { sku: "DEV-GEN-009", name: "قمقمه ورزشی یک لیتری", slug: "one-liter-sport-bottle", categorySlug: "sport-travel", description: "قمقمه ورزشی بدون نشتی و مناسب باشگاه.", stock: 21, fixedPrice: "7400000" },
    { sku: "DEV-GEN-010", name: "کوله پشتی طبیعت‌گردی", slug: "hiking-backpack", categorySlug: "sport-travel", description: "کوله سبک طبیعت‌گردی با بندهای قابل تنظیم.", stock: 6, fixedPrice: "38500000", discountPercent: "8", featured: true },
    { sku: "DEV-GEN-011", name: "ماساژور دستی شارژی", slug: "rechargeable-hand-massager", categorySlug: "beauty-health", description: "ماساژور شارژی با چند سطح شدت.", stock: 10, fixedPrice: "27600000" },
    { sku: "DEV-GEN-012", name: "ست مراقبت پوست روزانه", slug: "daily-skincare-set", categorySlug: "beauty-health", description: "ست آزمایشی مراقبت روزانه پوست شامل سه محصول.", stock: 14, fixedPrice: "34200000", discountPercent: "12", featured: true },
  ],
};
