import type { DevelopmentCategorySeed, DevelopmentStoreSeed } from "./types";

function mobileAttribute(id: string, name: string, values: string[]) {
  return { id, name, values };
}

// Structured from Digikala product dkp-20127115 (Apple iPhone 17 CH 256GB/8GB).
const mobileAttributeSeedSchema = [
  { id: "mobile_general", name: "مشخصات کلی", attributes: [
    mobileAttribute("mobile_region", "ریجن", ["چین"]),
    mobileAttribute("mobile_phone_type", "نوع گوشی موبایل", ["سیستم عامل iOS"]),
    mobileAttribute("mobile_category", "دسته‌بندی", ["پرچم‌دار"]),
    mobileAttribute("mobile_model", "مدل", ["iPhone 17 CH"]),
    mobileAttribute("mobile_intro_date", "زمان معرفی", ["۱۹ سپتامبر ۲۰۲۵"]),
    mobileAttribute("mobile_dimensions", "ابعاد", ["۱۴۹.۶ × ۷۱.۵ × ۸ میلی‌متر"]),
    mobileAttribute("mobile_weight", "وزن", ["۱۷۷ گرم"]),
    mobileAttribute("mobile_body", "توضیحات بدنه", ["قاب جلو از جنس شیشه Ceramic Shield 2، فریم آلومینیومی و قاب پشت شیشه‌ای"]),
    mobileAttribute("mobile_resistance", "قابلیت‌های مقاومتی", ["مقاوم در برابر نفوذ گرد و غبار", "مقاوم در برابر نفوذ آب"]),
    mobileAttribute("mobile_sim_count", "تعداد سیم‌کارت", ["دو عدد"]),
    mobileAttribute("mobile_sim_type", "نوع سیم‌کارت", ["سایز نانو (۸.۸ × ۱۲.۳ میلی‌متر)"]),
    mobileAttribute("mobile_key_features", "ویژگی‌های کلیدی", ["گواهی IP68 و مقاومت در عمق ۶ متری آب تا ۳۰ دقیقه، Ultra Wideband، پیام اضطراری SOS و مکان‌یابی ماهواره‌ای"]),
  ] },
  { id: "mobile_display", name: "صفحه نمایش", attributes: [
    mobileAttribute("mobile_display_technology", "فناوری صفحه نمایش", ["LTPO Super Retina XDR OLED"]),
    mobileAttribute("mobile_refresh_rate", "نرخ به‌روزرسانی تصویر", ["۱۲۰ هرتز"]),
    mobileAttribute("mobile_display_size", "اندازه", ["۶.۳ اینچ"]),
    mobileAttribute("mobile_screen_body_ratio", "نسبت صفحه نمایش به بدنه", ["۹۰.۱ درصد"]),
    mobileAttribute("mobile_aspect_ratio", "نسبت تصویر", ["۱۹.۵:۹"]),
    mobileAttribute("mobile_display_resolution", "رزولوشن صفحه نمایش", ["۱۲۰۶ × ۲۶۲۲ پیکسل"]),
    mobileAttribute("mobile_pixel_density", "تراکم پیکسلی", ["۴۵۸ پیکسل بر اینچ"]),
    mobileAttribute("mobile_screen_protection", "نوع محافظ صفحه نمایش گوشی", ["Ceramic Shield 2"]),
  ] },
  { id: "mobile_processor", name: "پردازنده", attributes: [
    mobileAttribute("mobile_chipset", "تراشه", ["Apple A19 (3 nm)"]),
    mobileAttribute("mobile_cpu", "پردازنده", ["شش هسته‌ای؛ دو هسته ۴.۲۶ گیگاهرتزی و چهار هسته ۲.۶۰ گیگاهرتزی"]),
    mobileAttribute("mobile_cpu_frequency", "فرکانس پردازنده مرکزی", ["۴.۲۶ تا ۲.۶۰ گیگاهرتز"]),
    mobileAttribute("mobile_gpu", "پردازنده گرافیکی", ["Apple GPU پنج هسته‌ای"]),
  ] },
  { id: "mobile_memory", name: "حافظه", attributes: [
    mobileAttribute("mobile_storage", "حافظه داخلی", ["۲۵۶ گیگابایت"]),
    mobileAttribute("mobile_ram", "مقدار RAM", ["۸ گیگابایت"]),
    mobileAttribute("mobile_memory_card", "پشتیبانی از کارت حافظه", ["فاقد پشتیبانی از کارت حافظه"]),
  ] },
  { id: "mobile_connectivity", name: "ارتباطات", attributes: [
    mobileAttribute("mobile_networks", "شبکه‌های مخابراتی", ["2G", "3G", "4G", "5G"]),
    mobileAttribute("mobile_bluetooth_version", "نسخه بلوتوث", ["۶"]),
    mobileAttribute("mobile_bluetooth_specs", "مشخصات بلوتوث", ["پشتیبانی از A2DP و فناوری کم‌مصرف LE برای اتصال بهتر به وسایل الکترونیکی"]),
    mobileAttribute("mobile_positioning", "تکنولوژی‌های مکان‌یابی (GPS)", ["GPS", "GALILEO", "GLONASS", "QZSS", "BDS (Beidou)"]),
    mobileAttribute("mobile_radio", "رادیو", ["عدم پشتیبانی"]),
    mobileAttribute("mobile_ports", "درگاه‌ها و فناوری‌های ارتباطی", ["USB Type-C 2.0", "DisplayPort"]),
    mobileAttribute("mobile_supported_connections", "شبکه‌های ارتباطی قابل پشتیبانی", ["NFC", "بلوتوث", "Wi-Fi"]),
  ] },
  { id: "mobile_camera", name: "دوربین", attributes: [
    mobileAttribute("mobile_rear_camera_count", "تعداد دوربین‌های پشت گوشی", ["۲ ماژول دوربین"]),
    mobileAttribute("mobile_main_lens_type", "نوع لنز دوربین اصلی", ["عریض"]),
    mobileAttribute("mobile_main_camera_resolution", "رزولوشن دوربین اصلی", ["۴۸ مگاپیکسل"]),
    mobileAttribute("mobile_main_camera_specs", "مشخصات دوربین اصلی", ["دیافراگم f/1.6، فاصله کانونی ۲۶ میلی‌متر، سنسور 1/1.56 اینچ، پیکسل ۱ میکرومتر، فوکوس دوگانه PDAF، لرزش‌گیر اپتیکال سنسور شیفت، HDR و پانوراما"]),
    mobileAttribute("mobile_second_lens_type", "نوع لنز دوربین دوم", ["فوق عریض"]),
    mobileAttribute("mobile_second_camera_resolution", "رزولوشن دوربین دوم", ["۱۲ مگاپیکسل"]),
    mobileAttribute("mobile_second_camera_specs", "مشخصات دوربین دوم", ["دیافراگم f/2.2، فاصله کانونی ۱۳ میلی‌متر، پیکسل ۰.۷ میکرومتر و فوکوس اتوماتیک دوگانه PDAF"]),
    mobileAttribute("mobile_focus_technology", "فناوری فوکوس", ["PDAF"]),
    mobileAttribute("mobile_video_resolution", "رزولوشن فیلمبرداری", ["4K"]),
    mobileAttribute("mobile_video_specs", "سایر مشخصات فیلمبرداری", ["فیلمبرداری 4K با سرعت ۶۰ فریم، 1080p با سرعت ۲۴۰ فریم، HDR، دالبی ویژن تا ۶۰ فریم و ضبط صدای استودیویی"]),
    mobileAttribute("mobile_flash", "فلش", ["Dual LED"]),
    mobileAttribute("mobile_selfie_resolution", "رزولوشن دوربین سلفی", ["۱۲ مگاپیکسل"]),
    mobileAttribute("mobile_selfie_specs", "مشخصات دوربین سلفی", ["دیافراگم f/1.9، فاصله کانونی ۲۳ میلی‌متر، فوکوس PDAF، سنسور SL 3D، فیلمبرداری 4K@60fps و 1080p@120fps، لرزش‌گیر ژیروسکوپی، Multi Aspect و Center Stage"]),
  ] },
  { id: "mobile_audio", name: "صدا", attributes: [
    mobileAttribute("mobile_speaker", "اسپیکر", ["استریو"]),
    mobileAttribute("mobile_audio_output", "خروجی صدا", ["USB Type-C"]),
  ] },
  { id: "mobile_software", name: "امکانات نرم‌افزاری", attributes: [
    mobileAttribute("mobile_os", "سیستم عامل", ["iOS"]),
    mobileAttribute("mobile_os_version", "نسخه سیستم عامل", ["iOS 26"]),
  ] },
  { id: "mobile_other", name: "سایر مشخصات", attributes: [
    mobileAttribute("mobile_sensors", "حس‌گرها", ["شتاب‌سنج", "قطب‌نما", "مجاورت", "ژیروسکوپ", "فشارسنج", "تشخیص چهره بیومتریک Face ID"]),
    mobileAttribute("mobile_battery_capacity", "ظرفیت باتری", ["۳۶۹۲ میلی‌آمپر ساعت"]),
    mobileAttribute("mobile_battery_type", "نوع باتری", ["لیتیوم یون"]),
    mobileAttribute("mobile_charging_power", "توان شارژ", ["۲۵ وات"]),
    mobileAttribute("mobile_charging_features", "قابلیت‌های شارژ", ["شارژ باسیم", "شارژ بی‌سیم", "شارژ معکوس"]),
    mobileAttribute("mobile_battery_specs", "مشخصات باتری", ["شارژ ۵۰ درصدی در ۲۰ دقیقه با PD3.2 و AVS، شارژ بی‌سیم ۲۵ وات MagSafe، شارژ بی‌سیم ۱۵ وات Qi2 و شارژ معکوس باسیم ۴.۵ وات"]),
    mobileAttribute("mobile_box_contents", "اقلام همراه", ["کابل USB Type-C", "دفترچه راهنما"]),
  ] },
] as const;

const mobileAttributeSchema: NonNullable<DevelopmentCategorySeed["attributeSchema"]> = mobileAttributeSeedSchema.map((group) => ({
  id: group.id,
  name: group.name,
  attributes: group.attributes.map((attribute) => ({ id: attribute.id, name: attribute.name })),
}));

const iphone17Attributes = mobileAttributeSeedSchema.flatMap((group) => group.attributes.map((attribute) => ({
  attributeId: attribute.id,
  values: [...attribute.values],
})));

export const generalStoreSeed: DevelopmentStoreSeed = {
  industry: "GENERAL",
  storeName: "فروشگاه توسعه",
  tagline: "انتخاب بهتر برای زندگی روزمره",
  shortDescription: "فروشگاه آزمایشی محصولات عمومی با قیمت ثابت، موجودی و تخفیف زمان‌دار",
  categories: [
    { name: "کالای دیجیتال", slug: "digital-products", description: "لوازم دیجیتال و جانبی پرکاربرد", attributeSchema: [{ id: "group_digital", name: "مشخصات فنی", attributes: [{ id: "digital_brand", name: "برند" }, { id: "digital_ram", name: "رم" }, { id: "digital_suitable", name: "مناسب برای" }] }] },
    { name: "موبایل", slug: "mobile-phones", parentSlug: "digital-products", description: "گوشی‌های موبایل هوشمند با مشخصات فنی کامل", attributeSchema: mobileAttributeSchema },
    { name: "خانه و آشپزخانه", slug: "home-kitchen", description: "محصولات کاربردی خانه و آشپزخانه", attributeSchema: [{ id: "group_home", name: "مشخصات کلی", attributes: [{ id: "home_material", name: "جنس" }, { id: "home_usage", name: "کاربرد" }] }] },
    { name: "مد و پوشاک", slug: "fashion-clothing", description: "پوشاک و اکسسوری روزمره", attributeSchema: [{ id: "group_fashion", name: "جزئیات محصول", attributes: [{ id: "fashion_material", name: "جنس پارچه" }, { id: "fashion_suitable", name: "مناسب برای" }] }] },
    { name: "ورزش و سفر", slug: "sport-travel", description: "لوازم ورزشی، کمپ و سفر", attributeSchema: [{ id: "group_sport", name: "مشخصات استفاده", attributes: [{ id: "sport_capacity", name: "ظرفیت" }, { id: "sport_usage", name: "مناسب برای" }] }] },
    { name: "زیبایی و سلامت", slug: "beauty-health", description: "محصولات مراقبت شخصی و سلامت", attributeSchema: [{ id: "group_beauty", name: "مشخصات مراقبتی", attributes: [{ id: "beauty_skin", name: "نوع پوست" }, { id: "beauty_origin", name: "کشور سازنده" }] }] },
  ],
  products: [
    { sku: "DEV-GEN-001", name: "هدفون بی‌سیم نوا", slug: "nova-wireless-headphones", categorySlug: "digital-products", description: "هدفون بی‌سیم سبک با شارژدهی مناسب استفاده روزمره.", stock: 18, fixedPrice: "32900000", discountPercent: "10", featured: true, attributes: [{ attributeId: "digital_brand", values: ["نوا"] }, { attributeId: "digital_ram", values: ["۱۲ گیگابایت"] }, { attributeId: "digital_suitable", values: ["آقایان", "خانم‌ها"] }] },
    { sku: "DEV-GEN-002", name: "پاوربانک ۲۰ هزار آمپر", slug: "20000mah-power-bank", categorySlug: "digital-products", description: "پاوربانک دو خروجی با نمایشگر میزان شارژ.", stock: 11, fixedPrice: "24800000", featured: true, attributes: [{ attributeId: "digital_brand", values: ["انرژی پلاس"] }, { attributeId: "digital_suitable", values: ["سفر", "استفاده روزمره"] }] },
    { sku: "DEV-GEN-003", name: "کیبورد مکانیکی مینی", slug: "mini-mechanical-keyboard", categorySlug: "digital-products", description: "کیبورد مکانیکی جمع‌وجور مناسب کار و بازی.", stock: 7, fixedPrice: "45900000", attributes: [{ attributeId: "digital_brand", values: ["کی‌تک"] }, { attributeId: "digital_suitable", values: ["کار", "بازی"] }] },
    { sku: "DEV-GEN-004", name: "ماگ حرارتی سرامیکی", slug: "ceramic-thermal-mug", categorySlug: "home-kitchen", description: "ماگ سرامیکی دوجداره مناسب نوشیدنی گرم.", stock: 24, fixedPrice: "8900000", discountPercent: "15", featured: true, attributes: [{ attributeId: "home_material", values: ["سرامیک"] }, { attributeId: "home_usage", values: ["نوشیدنی گرم", "محل کار"] }] },
    { sku: "DEV-GEN-005", name: "ترازو آشپزخانه دیجیتال", slug: "digital-kitchen-scale", categorySlug: "home-kitchen", description: "ترازوی دقیق آشپزخانه با واحدهای اندازه‌گیری متنوع.", stock: 13, fixedPrice: "12700000" },
    { sku: "DEV-GEN-006", name: "چراغ مطالعه تاشو", slug: "foldable-desk-lamp", categorySlug: "home-kitchen", description: "چراغ مطالعه LED با نور قابل تنظیم.", stock: 9, fixedPrice: "16500000", featured: true },
    { sku: "DEV-GEN-007", name: "هودی پنبه‌ای ساده", slug: "basic-cotton-hoodie", categorySlug: "fashion-clothing", description: "هودی پنبه‌ای راحت با دوخت مقاوم.", stock: 16, fixedPrice: "29800000", discountPercent: "20" },
    { sku: "DEV-GEN-008", name: "کیف دوشی مینیمال", slug: "minimal-shoulder-bag", categorySlug: "fashion-clothing", description: "کیف دوشی سبک با فضای مناسب وسایل روزمره.", stock: 8, fixedPrice: "21900000", featured: true },
    { sku: "DEV-GEN-009", name: "قمقمه ورزشی یک لیتری", slug: "one-liter-sport-bottle", categorySlug: "sport-travel", description: "قمقمه ورزشی بدون نشتی و مناسب باشگاه.", stock: 21, fixedPrice: "7400000" },
    { sku: "DEV-GEN-010", name: "کوله پشتی طبیعت‌گردی", slug: "hiking-backpack", categorySlug: "sport-travel", description: "کوله سبک طبیعت‌گردی با بندهای قابل تنظیم.", stock: 6, fixedPrice: "38500000", discountPercent: "8", featured: true },
    { sku: "DEV-GEN-011", name: "ماساژور دستی شارژی", slug: "rechargeable-hand-massager", categorySlug: "beauty-health", description: "ماساژور شارژی با چند سطح شدت.", stock: 10, fixedPrice: "27600000" },
    { sku: "DEV-GEN-012", name: "ست مراقبت پوست روزانه", slug: "daily-skincare-set", categorySlug: "beauty-health", description: "ست آزمایشی مراقبت روزانه پوست شامل سه محصول.", stock: 14, fixedPrice: "34200000", discountPercent: "12", featured: true },
    { sku: "DEV-GEN-013", name: "گوشی موبایل اپل مدل iPhone 17 CH دو سیم‌کارت ظرفیت ۲۵۶ گیگابایت و رم ۸ گیگابایت", slug: "apple-iphone-17-ch-256gb-8gb", categorySlug: "mobile-phones", description: "گوشی پرچم‌دار اپل با تراشه A19، نمایشگر LTPO Super Retina XDR OLED و دوربین دوگانه.", stock: 4, fixedPrice: "2859990000", featured: true, attributes: iphone17Attributes },
  ],
};
