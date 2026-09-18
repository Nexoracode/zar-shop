import type { DevelopmentArticleCategorySeed, DevelopmentArticleSeed, DevelopmentAuthorSeed, DevelopmentBrandSeed, DevelopmentCategorySeed, DevelopmentMediaSeed, DevelopmentStoreSeed } from "./types";

// Snapshot of prisma\zar-shop's real MediaAsset table (and every category/product/homepage
// slot that referenced it) captured 2026-08-23. The files themselves already live on the FTP
// host (dl.poshtybanman.ir) independent of this database — only the DB rows describing them
// were ever lost on reseed — so this just recreates those rows and rewires the same slots.
const CDN = "https://dl.poshtybanman.ir/zar-shop";
function media(key: string, scope: DevelopmentMediaSeed["scope"], folder: string, file: string, title: string, mimeType: string, sizeBytes: number): DevelopmentMediaSeed {
  return { key, scope, type: "IMAGE", url: `${CDN}/${folder}/${file}`, storageKey: `zar-shop/${folder}/${file}`, title, mimeType, sizeBytes };
}

const generalMediaSeed: DevelopmentMediaSeed[] = [
  // Category photos (one unused leftover upload preserved as-is, matching the live table).
  media("category-mobile-phones", "CATEGORY", "categories", "67e50d8c-6064-4269-9941-d5c5638e1282.webp", "2df8097c-cb92-4876-84bd-cce7f00ff3de.webp", "image/webp", 44530),
  media("category-digital-products", "CATEGORY", "categories", "34d6b50c-7149-48ef-94ed-1ee34c183177.webp", "07cb7e90-f020-4a4e-8eea-bc49db2d5539.webp", "image/webp", 67712),
  media("category-beauty-health", "CATEGORY", "categories", "02dc0a7f-a63a-4d7c-a1a7-d7a5bae1f774.webp", "208d0928-85e8-41d7-995f-98d4cafe7e41.webp", "image/webp", 72776),
  media("category-sport-travel", "CATEGORY", "categories", "4e255599-ec4d-4751-90b7-57bbd830c8b5.webp", "289299a3-e800-4565-8c3f-adc961f057fa.webp", "image/webp", 81412),
  media("category-unused-1", "CATEGORY", "categories", "07c0663b-dcf6-49e3-90ea-38dcc79fb8cf.webp", "b11e6e18-6efc-4ae1-b4d2-65e1bbc5ffa0.webp", "image/webp", 89262),
  media("category-fashion-clothing", "CATEGORY", "categories", "d0d3bca8-94d5-45a5-99a2-59a269baae41.webp", "d1b75c62-fb15-453b-b057-1c2fa15f8c26.webp", "image/webp", 83178),
  media("category-home-kitchen", "CATEGORY", "categories", "27006b07-ea07-4a0b-bdba-6d51565f95f8.webp", "dea9d608-7c26-49bb-9de4-59695c253bb6.webp", "image/webp", 45864),

  // Product photos — several are intentionally reused across multiple products, exactly as
  // the live catalog does (a shared placeholder image, not a duplicate upload).
  media("product-media-01", "PRODUCT", "products", "bc547cc7-7887-4ebf-9392-d7d636733aea.webp", "0a394fcf-e5e3-4420-a397-336f6e87ff46.webp", "image/webp", 6696),
  media("product-media-02", "PRODUCT", "products", "49b62463-de2b-4602-a897-7aa37c538705.webp", "4ac8d803-1669-434a-b96d-dff29b9748e3.webp", "image/webp", 22932),
  media("product-media-03", "PRODUCT", "products", "a6160191-8f70-4460-a91e-030c2f1d13c4.webp", "5a23b3ee-08f3-4fbb-92e8-17ca7522d4f9.webp", "image/webp", 4754),
  media("product-media-04", "PRODUCT", "products", "b074c52a-9211-43d2-b5a0-baeb42d7c23f.webp", "21f9856d-c0e9-4fbd-93ae-08d9cdef60ed.webp", "image/webp", 20100),
  media("product-media-05", "PRODUCT", "products", "716680a7-9362-4776-8306-f92b5484cc38.webp", "27f472c7-b57d-41d0-aee5-48eb27622379.webp", "image/webp", 23356),
  media("product-media-06", "PRODUCT", "products", "4640931f-425a-49b3-b65d-c66786ccf598.webp", "91afe5cb-e727-415a-af11-05d33fb9f955.webp", "image/webp", 4680),
  media("product-media-07", "PRODUCT", "products", "19626edc-c97d-4156-9d93-58b158fa540e.webp", "407df3c3-6238-4ac6-9a7a-e834e2b7a8dc.webp", "image/webp", 21330),
  media("product-media-08", "PRODUCT", "products", "5a7c15e8-e680-4341-88e9-eae00098d980.webp", "5373f773-608e-42d2-a329-b4e14d80c644.webp", "image/webp", 9910),
  media("product-media-09", "PRODUCT", "products", "51f263b0-f1ce-4094-a4a1-c9890e0078ec.webp", "75987842-6bcd-4465-bc6a-da275d802722.webp", "image/webp", 3308),
  media("product-media-10", "PRODUCT", "products", "61482b29-8cec-425a-a1e5-f414e9651eaa.webp", "a5549ede-f133-4515-b7af-a7aa802b9602.webp", "image/webp", 4908),
  media("product-media-11", "PRODUCT", "products", "d5ac530a-f220-4a22-b59b-1a964926adac.webp", "ab97647f-c5fe-4222-854c-113fb8c713a1.webp", "image/webp", 7222),
  media("product-media-12", "PRODUCT", "products", "083717e3-4480-44da-b8c1-a4806adddd19.webp", "c185fb52-7ab0-4822-a4fa-f519a1be2a04.webp", "image/webp", 14464),
  media("product-media-13", "PRODUCT", "products", "020e713a-c17b-4221-b661-2d1f5d9c841a.webp", "c500192a-b067-4a60-a914-52d32f92c5c0.webp", "image/webp", 44476),
  media("product-media-14", "PRODUCT", "products", "94da9c64-fd23-4f2d-88bf-bf14f515d0a1.webp", "ed123420-3fd0-4eb7-9f51-a2b4337611c9.webp", "image/webp", 25632),
  media("product-media-15", "PRODUCT", "products", "ab37bb9b-2543-45ef-8aa9-e9c5462078a8.webp", "eeea9b90-ccdf-42ea-9807-1bf2fc617bf0.webp", "image/webp", 4714),
  media("product-media-16", "PRODUCT", "products", "90fe45f4-9c3c-4678-8dcb-2fd99bc9aab9.webp", "ef303171-c6d7-4481-84b9-a8cc0a9e37f4.webp", "image/webp", 4180),
  media("product-media-17", "PRODUCT", "products", "7c511d02-4d7a-4ab9-b0f5-fa8eb260a06d.webp", "f767d0a1-aebe-47b9-8db8-a59bad57d2b2.webp", "image/webp", 26550),

  // Homepage art (hero slides, promo tiles, promo banner). Two leftover uploads not
  // currently referenced by any slot are kept too, matching the live table.
  media("homepage-01", "HOMEPAGE", "homepage", "60ee451a-4917-449c-bcea-ef9b23aad2f7.webp", "8d81c2a2-e4d3-4a10-9422-9ae3344ee415.webp", "image/webp", 82242),
  media("homepage-02", "HOMEPAGE", "homepage", "93be1d7f-28bf-4026-b72a-825b51235f71.webp", "9bebb91b-78a5-4a55-8cf3-893ac794b27b.webp", "image/webp", 81706),
  media("homepage-03", "HOMEPAGE", "homepage", "3d2e7068-17c0-4fc5-b25d-15b96673fd0c.webp", "30d9abb7-573e-4931-aa1f-104117c707a6.webp", "image/webp", 159918),
  media("homepage-04", "HOMEPAGE", "homepage", "310ee368-3719-42b7-aae9-f63861bdbc06.gif", "8189ba26-1355-4430-9d9d-3790e4fb105c.gif", "image/gif", 545949),
  media("homepage-05", "HOMEPAGE", "homepage", "6e0119f2-08bf-400e-a776-4515b04cf981.gif", "716810b7-4949-49a9-b99e-5eb08caf0d66.gif", "image/gif", 908755),
  media("homepage-06", "HOMEPAGE", "homepage", "a739803a-839a-4813-af06-9a1ca7edfe00.webp", "41172700-dc8c-4a43-8e35-7fbb4766172f.webp", "image/webp", 287446),
  media("homepage-07", "HOMEPAGE", "homepage", "b8957adf-b442-41e7-95b1-7805c16281db.webp", "b583ab06-2741-465e-a2f1-e7f904db9721.webp", "image/webp", 52302),
  media("homepage-08", "HOMEPAGE", "homepage", "1bbd8945-b835-498d-9e2c-b98d4f314a4d.webp", "e7f4a198-3642-4e6e-9d88-56a9f00610bd.webp", "image/webp", 46408),
  media("homepage-09", "HOMEPAGE", "homepage", "57230eb2-1fc8-4a79-862c-4c4d86c2ec31.webp", "63dac27a2683e2020a474e188c1afadac37d2fa4_1786526336.webp", "image/webp", 10394),

  // Brand logo, reused for the dark-mode logo, favicon and social-share image (as it is live).
  media("brand-logo", "BRAND", "brand", "40345de7-8f83-4b26-b0a9-70c15d0ea94d.png", "a777e6b2-a673-4384-8d13-3039befa6667.png", "image/png", 4796),
];

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

// Every category (mobile aside, which already leans on a real name — اپل) gets its own placeholder
// manufacturer, matching the fictional "برند" attribute values digital-products already carried,
// so a reseed never leaves a product without one.
const generalBrandSeed: DevelopmentBrandSeed[] = [
  { name: "نوا", slug: "nova", featured: true },
  { name: "انرژی پلاس", slug: "energy-plus", featured: true },
  { name: "کی‌تک", slug: "keytech" },
  { name: "خانه‌آرا", slug: "khaneara", featured: true },
  { name: "استایل‌لاین", slug: "styleline", featured: true },
  { name: "کوه‌پیما", slug: "kouhpeyma" },
  { name: "پوست‌ناز", slug: "poustnaz" },
  { name: "اپل", slug: "apple", featured: true },
];

// Blog demo data. Cover images reuse existing homepage media keys from generalMediaSeed above
// (same real, already-hosted files) rather than a separate upload — a MediaAsset row can be
// referenced from more than one place, exactly like product photos already are.
const generalAuthorSeed: DevelopmentAuthorSeed[] = [
  { key: "editorial-team", name: "تحریریه فروشگاه", bio: "تیم تحریریه با تجربه خرید و استفاده واقعی از محصولات، راهنما و نکات کاربردی می‌نویسد." },
];

const generalArticleCategorySeed: DevelopmentArticleCategorySeed[] = [
  { key: "buying-guide", name: "راهنمای خرید", slug: "buying-guide" },
  { key: "tips-tricks", name: "نکات و ترفندها", slug: "tips-tricks" },
  { key: "news-deals", name: "اخبار و تخفیف‌ها", slug: "news-deals" },
  { key: "calligraphy", name: "خطاطی", slug: "calligraphy" },
];

const generalArticleSeed: DevelopmentArticleSeed[] = [
  {
    title: "راهنمای خرید هدفون بی‌سیم: چه نکاتی را باید بررسی کنید؟",
    slug: "wireless-headphones-buying-guide",
    excerpt: "قبل از خرید هدفون بی‌سیم بعدی‌تان، این چند نکته دربارهٔ باتری، کیفیت صدا و راحتی استفاده را بررسی کنید.",
    content: "<h2>چرا انتخاب هدفون بی‌سیم سخت شده؟</h2><p>بازار هدفون‌های بی‌سیم این روزها پر از گزینه‌های مختلف با قیمت و امکانات متفاوت است. برای اینکه سردرگم نشوید، بهتر است قبل از خرید چند معیار ساده را در نظر بگیرید.</p><h2>عمر باتری</h2><p>برای استفاده روزمره، هدفونی را انتخاب کنید که حداقل ۲۰ ساعت با یک بار شارژ کار کند. جعبه شارژ همراه هم باید بتواند چند بار شارژ کامل اضافه در اختیارتان بگذارد.</p><h2>کیفیت صدا و میکروفون</h2><p>اگر قرار است از هدفون برای تماس‌های کاری هم استفاده کنید، کیفیت میکروفون به همان اندازه کیفیت پخش صدا اهمیت دارد.</p><ul><li>وزن سبک برای استفاده طولانی‌مدت</li><li>مقاومت در برابر عرق و رطوبت برای ورزش</li><li>اتصال پایدار بلوتوث بدون قطعی</li></ul><p>با در نظر گرفتن این نکات، انتخاب بین گزینه‌های مختلف فروشگاه بسیار ساده‌تر خواهد شد.</p>",
    categoryKey: "buying-guide",
    authorKey: "editorial-team",
    coverKey: "homepage-01",
    tags: ["هدفون", "کالای دیجیتال", "راهنمای خرید"],
    publishedAt: "2026-08-05T08:00:00.000Z",
  },
  {
    title: "۵ ترفند برای افزایش عمر باتری پاوربانک",
    slug: "power-bank-battery-life-tips",
    excerpt: "با رعایت چند نکته ساده، می‌توانید عمر باتری پاوربانک خود را برای سال‌ها حفظ کنید.",
    content: "<h2>پاوربانک را کامل خالی نکنید</h2><p>شارژ و دشارژ کامل مکرر به باتری‌های لیتیومی آسیب می‌زند. تا حد امکان قبل از رسیدن به صفر درصد، دستگاه را شارژ کنید.</p><h2>از گرما و سرمای شدید دور نگه دارید</h2><p>نگهداری پاوربانک در ماشین در روزهای گرم تابستان یا محیط‌های بسیار سرد، عمر باتری را به‌سرعت کاهش می‌دهد.</p><h2>شارژر اورجینال استفاده کنید</h2><p>استفاده از شارژرهای بی‌کیفیت می‌تواند باعث نوسان جریان و آسیب به سلول‌های باتری شود.</p><ul><li>هر چند ماه یک‌بار پاوربانک را کامل شارژ و دشارژ کنید</li><li>در محل خشک و خنک نگهداری کنید</li><li>از افتادن و ضربه به دستگاه جلوگیری کنید</li></ul>",
    categoryKey: "tips-tricks",
    authorKey: "editorial-team",
    coverKey: "homepage-07",
    tags: ["پاوربانک", "نکات کاربردی"],
    publishedAt: "2026-08-12T08:00:00.000Z",
  },
  {
    title: "چگونه کوله پشتی مناسب سفر و طبیعت‌گردی انتخاب کنیم؟",
    slug: "hiking-backpack-buying-guide",
    excerpt: "انتخاب کوله پشتی مناسب می‌تواند تفاوت زیادی در راحتی سفرهای طبیعت‌گردی شما ایجاد کند.",
    content: "<h2>حجم مناسب را مشخص کنید</h2><p>برای سفرهای یک‌روزه، کوله ۲۰ تا ۳۰ لیتری کافی است؛ اما برای کوله‌گردی چندروزه به حجم ۴۰ لیتر یا بیشتر نیاز خواهید داشت.</p><h2>راحتی بندها و پشتی</h2><p>بندهای قابل‌تنظیم و پشتی دارای تهویه، فشار روی شانه و کمر را در طول مسیرهای طولانی کاهش می‌دهند.</p><h2>مقاومت در برابر آب</h2><p>پارچه ضدآب یا حداقل مقاوم در برابر رطوبت، از خیس‌شدن وسایل داخل کوله در بارش ناگهانی جلوگیری می‌کند.</p><p>با توجه به این نکات، کوله‌ای انتخاب کنید که هم به نوع سفرتان بخورد و هم استفاده روزمره از آن راحت باشد.</p>",
    categoryKey: "buying-guide",
    authorKey: "editorial-team",
    coverKey: "homepage-02",
    tags: ["کوله پشتی", "ورزش و سفر"],
    publishedAt: "2026-08-19T08:00:00.000Z",
  },
  {
    title: "راهنمای مراقبت روزانه از پوست در فصل‌های مختلف",
    slug: "daily-skincare-guide-by-season",
    excerpt: "نیاز پوست شما در تابستان و زمستان متفاوت است؛ این راهنما کمکتان می‌کند روتین مناسب فصل را انتخاب کنید.",
    content: "<h2>تابستان: تمرکز روی محافظت</h2><p>در فصل گرما، استفاده از ضدآفتاب سبک و مرطوب‌کننده‌های غیرچرب اولویت اصلی است.</p><h2>زمستان: آبرسانی عمیق‌تر</h2><p>هوای خشک زمستان باعث از دست رفتن رطوبت پوست می‌شود، بنابراین کرم‌های مرطوب‌کننده غلیظ‌تر توصیه می‌شوند.</p><h2>ثابت‌ماندن روتین پایه</h2><p>شست‌وشوی ملایم صورت و استفاده منظم از مرطوب‌کننده، صرف‌نظر از فصل، پایه هر روتین مراقبت پوستی است.</p><ul><li>ضدآفتاب را هرگز فراموش نکنید</li><li>محصولات متناسب با نوع پوست خود انتخاب کنید</li><li>تغییرات پوست را در طول فصل‌ها زیر نظر داشته باشید</li></ul>",
    categoryKey: "tips-tricks",
    authorKey: "editorial-team",
    coverKey: "homepage-08",
    tags: ["مراقبت پوست", "زیبایی و سلامت"],
    publishedAt: "2026-08-26T08:00:00.000Z",
  },
  {
    title: "جشنواره تخفیف پاییزه فروشگاه آغاز شد",
    slug: "autumn-discount-festival",
    excerpt: "با شروع فصل پاییز، بخشی از محصولات پرطرفدار فروشگاه با تخفیف ویژه عرضه می‌شوند.",
    content: "<h2>تخفیف روی دسته‌بندی‌های پرفروش</h2><p>در جشنواره پاییزه امسال، محصولات منتخب از دسته‌بندی‌های کالای دیجیتال، خانه و آشپزخانه و مد و پوشاک با تخفیف ویژه عرضه می‌شوند.</p><h2>موجودی محدود</h2><p>با توجه به استقبال بالا، برخی محصولات ممکن است زودتر از موعد از موجودی خارج شوند؛ پیشنهاد می‌کنیم خرید خود را به تعویق نیندازید.</p><p>برای مشاهده فهرست کامل محصولات تخفیف‌دار، به صفحه محصولات فروشگاه سر بزنید.</p>",
    categoryKey: "news-deals",
    authorKey: "editorial-team",
    coverKey: "homepage-03",
    tags: ["تخفیف", "اخبار فروشگاه"],
    publishedAt: "2026-09-02T08:00:00.000Z",
  },
  {
    title: "بررسی iPhone 17: آیا ارتقا ارزشش را دارد؟",
    slug: "iphone-17-review",
    excerpt: "نگاهی به مهم‌ترین تغییرات آیفون ۱۷ نسبت به نسل قبل و اینکه چه کسانی باید به فکر ارتقا باشند.",
    content: "<h2>طراحی و نمایشگر</h2><p>آیفون ۱۷ با نمایشگر LTPO Super Retina XDR OLED و نرخ به‌روزرسانی ۱۲۰ هرتز، تجربه بصری نرم‌تری نسبت به نسل‌های قبل ارائه می‌دهد.</p><h2>عملکرد تراشه A19</h2><p>تراشه جدید بهبود محسوسی در سرعت پردازش و بهینگی مصرف انرژی نسبت به نسل قبل دارد، به‌خصوص در اجرای برنامه‌های سنگین و بازی.</p><h2>دوربین</h2><p>دوربین دوگانه با لنز عریض و فوق‌عریض، همراه با بهبودهای نرم‌افزاری در HDR و ضبط ویدئوی 4K، یکی از نقاط قوت این نسل است.</p><h2>جمع‌بندی</h2><p>اگر از دو نسل قبل استفاده می‌کنید، ارتقا منطقی به‌نظر می‌رسد؛ اما برای صاحبان نسل قبلی، تفاوت‌ها ممکن است آن‌قدر محسوس نباشد که ارتقای فوری را توجیه کند.</p>",
    categoryKey: "buying-guide",
    authorKey: "editorial-team",
    coverKey: "product-media-14",
    tags: ["موبایل", "اپل", "بررسی محصول"],
    publishedAt: "2026-09-09T08:00:00.000Z",
  },

  // Long-form calligraphy series — same author/cover pool as the rest of the blog demo data,
  // used to test the reading list, pagination and reading-time UI against longer content.
  {
    title: "تاریخچه خط نستعلیق در ایران؛ از پیدایش تا اوج هنری",
    slug: "nastaliq-history-in-iran",
    excerpt: "خط نستعلیق یکی از شناخته‌شده‌ترین خطوط فارسی است. در این مطلب سیر تحول این خط از قرن هشتم هجری تا امروز را بررسی می‌کنیم.",
    content: "<h2>پیدایش خط نستعلیق</h2><p>خط نستعلیق حاصل ترکیب دو خط نسخ و تعلیق است و همین ترکیب، نامش را نیز شکل داده است. بر اساس روایت‌های تاریخی، این خط در قرن هشتم هجری در ایران شکل گرفت و به‌سرعت جای خود را در میان کاتبان و هنرمندان باز کرد.</p><h2>دوران اوج در عصر صفوی</h2><p>در دوران صفویه، خط نستعلیق به یکی از خطوط رسمی دربار و کتابخانه‌های سلطنتی تبدیل شد. استادانی که در این دوره ظهور کردند، قواعد ترکیب حروف و تناسب کلمات را به شکلی منظم درآوردند که هنوز هم مرجع آموزش خطاطی است.</p><h2>ویژگی‌های بصری نستعلیق</h2><p>برخلاف خطوط هندسی مانند کوفی، نستعلیق خطی روان و موزون است که کشیدگی حروف و فاصله‌های نرم میان کلمات، حس حرکت و ریتم را به بیننده منتقل می‌کند. همین ویژگی باعث شده نستعلیق را «عروس خطوط اسلامی» بنامند.</p><h2>جایگاه نستعلیق در دنیای امروز</h2><p>امروزه نستعلیق فقط در کتابت سنتی باقی نمانده و در طراحی لوگو، تایپوگرافی فارسی و حتی هنرهای دیجیتال نیز کاربرد گسترده‌ای پیدا کرده است.</p><ul><li>ریشه در ترکیب خط نسخ و تعلیق</li><li>اوج شکوفایی در دوران صفویه</li><li>کاربرد گسترده در طراحی گرافیک فارسی امروز</li></ul><p>شناخت تاریخچه این خط، درک عمیق‌تری از قواعد زیبایی‌شناسی آن به هنرجو می‌دهد و مسیر تمرین را هدفمندتر می‌کند.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-01",
    tags: ["خطاطی", "نستعلیق", "تاریخ هنر"],
    publishedAt: "2026-09-10T08:00:00.000Z",
  },
  {
    title: "ابزار و لوازم اولیه برای شروع خطاطی؛ چه چیزهایی واقعاً لازم است؟",
    slug: "calligraphy-starter-tools-guide",
    excerpt: "پیش از خرید هر وسیله‌ای برای تمرین خطاطی، بهتر است بدانید کدام ابزار برای شروع ضروری‌اند و کدام‌ها را می‌توان بعداً تهیه کرد.",
    content: "<h2>قلم نی، ابزار اصلی خطاطی سنتی</h2><p>قلم نی همچنان مهم‌ترین ابزار خطاطی سنتی است. انتخاب نی مناسب با ضخامت و سختی متعادل، تأثیر مستقیمی روی کیفیت خطوط دارد و بهتر است در قدم اول از نی‌های آماده و تراشیده‌شده استفاده کنید.</p><h2>مرکب و کاغذ</h2><p>مرکب چینی یا مرکب مخصوص خطاطی، رنگ یکدست‌تری نسبت به جوهرهای معمولی ایجاد می‌کند. برای تمرین روزانه، کاغذهای اسطرلاب یا کاغذهای صیقلی مخصوص خطاطی بهترین سطح برای حرکت روان قلم را فراهم می‌کنند.</p><h2>لوح یا زیردستی مناسب</h2><p>یک سطح صاف و ثابت زیر کاغذ، از لرزش دست و پخش‌شدن مرکب جلوگیری می‌کند. بسیاری از هنرجویان تازه‌کار این وسیله ساده را نادیده می‌گیرند در حالی که تأثیر زیادی روی کیفیت نهایی خط دارد.</p><h2>چه چیزهایی را می‌توان بعداً خرید؟</h2><p>تراش قلم اختصاصی، جامدادی چوبی سنتی و انواع مرکب رنگی، ابزارهایی هستند که در ماه‌های اول یادگیری ضروری نیستند و بهتر است پس از تسلط نسبی به مجموعه ابزار اضافه شوند.</p><ul><li>قلم نی آماده برای شروع</li><li>مرکب مخصوص خطاطی و کاغذ صیقلی</li><li>زیردستی صاف برای ثبات دست</li><li>تراش اختصاصی، در قدم‌های بعدی</li></ul><p>شروع با مجموعه‌ای ساده و باکیفیت، بهتر از خرید حجم زیادی ابزار در ابتدای مسیر است.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-02",
    tags: ["خطاطی", "ابزار خطاطی", "راهنمای خرید"],
    publishedAt: "2026-09-11T08:00:00.000Z",
  },
  {
    title: "خط نسخ و خط ثلث؛ چه تفاوت‌هایی این دو خط را از هم جدا می‌کند؟",
    slug: "naskh-vs-thuluth-differences",
    excerpt: "نسخ و ثلث از خطوط اصلی اسلامی هستند که کاربردهای متفاوتی دارند. در این مقاله ویژگی‌های هر یک را با هم مقایسه می‌کنیم.",
    content: "<h2>خط نسخ؛ خط کتابت روزمره</h2><p>خط نسخ به دلیل خوانایی بالا و سادگی نسبی، برای کتابت متون طولانی مانند قرآن و کتاب‌های علمی به کار می‌رفته است. حروف در این خط استوار و منظم هستند و فاصله میان کلمات معمولاً یکنواخت است.</p><h2>خط ثلث؛ خط تزیینی و پرشکوه</h2><p>در مقابل، ثلث خطی تزیینی و پیچیده‌تر است که بیشتر برای عنوان‌ها، کتیبه‌ها و تزیینات بناهای مذهبی استفاده می‌شود. کشیدگی عمودی حروف و ترکیب‌بندی هنرمندانه کلمات، ثلث را به خطی با ظاهر رسمی و پرشکوه تبدیل کرده است.</p><h2>تفاوت در کاربرد عملی</h2><p>نسخ برای متن‌های طولانی و خوانایی بالا انتخاب می‌شود، در حالی که ثلث بیشتر در نوشته‌های کوتاه، تزیینی و تأکیدی به کار می‌رود؛ مثل عنوان کتاب‌ها یا کتیبه‌های سردر بناها.</p><h2>یادگیری کدام خط را باید زودتر شروع کرد؟</h2><p>بسیاری از استادان خطاطی توصیه می‌کنند که هنرجو ابتدا با نسخ شروع کند، چون قواعد پایه‌ای حروف را بهتر منتقل می‌کند و پس از تسلط نسبی، ورود به ثلث ساده‌تر خواهد بود.</p><ul><li>نسخ: ساده، خوانا، مناسب متون بلند</li><li>ثلث: تزیینی، پیچیده، مناسب عنوان و کتیبه</li><li>ترتیب پیشنهادی یادگیری: نسخ و سپس ثلث</li></ul>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-03",
    tags: ["خطاطی", "خط نسخ", "خط ثلث"],
    publishedAt: "2026-09-12T08:00:00.000Z",
  },
  {
    title: "چگونه قلم نی را برای خطاطی به‌درستی تراش بزنیم؟",
    slug: "how-to-cut-reed-pen-for-calligraphy",
    excerpt: "تراش صحیح قلم نی یکی از مهم‌ترین مهارت‌های پایه در خطاطی سنتی است که کیفیت خط را مستقیماً تحت تأثیر قرار می‌دهد.",
    content: "<h2>انتخاب نی مناسب</h2><p>پیش از هر چیز باید نی‌ای با ضخامت متناسب با اندازه خط مورد نظر انتخاب شود. نی‌های تیره‌رنگ و کمی سخت معمولاً دوام بیشتری در برابر فشار قلم دارند.</p><h2>برش اولیه سر قلم</h2><p>سر نی با یک برش مورب و تیز آماده می‌شود تا نوک قلم باریک و صاف شکل بگیرد. این برش باید یک‌بار و با اطمینان انجام شود تا لبه‌های قلم دندانه‌دار نشوند.</p><h2>شکافتن نوک قلم</h2><p>یک شکاف کوچک و دقیق در وسط نوک قلم ایجاد می‌شود تا مرکب به‌طور یکنواخت در طول نوشتن جاری شود. عمق این شکاف باید متناسب با ضخامت خط انتخابی باشد.</p><h2>تراش زاویه قلم</h2><p>زاویه برش نهایی نوک قلم، پهنای خط و کج یا راست بودن آن را تعیین می‌کند. بسیاری از خطاطان برای هر سبک خطی (نستعلیق، نسخ یا ثلث) زاویه تراش متفاوتی به‌کار می‌برند.</p><h2>نگهداری قلم پس از تراش</h2><p>پس از هر جلسه تمرین، بهتر است نوک قلم را تمیز و خشک نگه دارید تا رسوب مرکب باعث کندشدن یا خرابی نوک نشود.</p><ul><li>انتخاب نی با ضخامت متناسب</li><li>برش اولیه صاف و یک‌باره</li><li>شکاف دقیق در نوک قلم</li><li>تراش زاویه مطابق سبک خط</li></ul><p>تسلط بر تراش قلم زمان می‌برد، اما همین مهارت پایه، تفاوت اصلی میان یک خط تمیز و یک خط ناهموار را رقم می‌زند.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-05",
    tags: ["خطاطی", "قلم نی", "آموزش خطاطی"],
    publishedAt: "2026-09-13T08:00:00.000Z",
  },
  {
    title: "نقش خطاطی در هنر تذهیب و کتاب‌آرایی سنتی ایران",
    slug: "calligraphy-in-illumination-and-bookmaking",
    excerpt: "خطاطی و تذهیب همیشه در کنار هم رشد کرده‌اند. در این مطلب رابطه این دو هنر و نقش هر کدام در کتاب‌آرایی سنتی را بررسی می‌کنیم.",
    content: "<h2>ارتباط تنگاتنگ خط و تذهیب</h2><p>در بسیاری از نسخه‌های خطی و کتاب‌های تاریخی، خط زیبا به‌تنهایی کافی نبوده و تذهیب‌کاران با افزودن نقش‌ونگارهای رنگی، صفحه را به یک اثر هنری کامل تبدیل می‌کردند.</p><h2>جایگاه سرلوح و کتیبه در کتاب‌آرایی</h2><p>سرلوح‌های ابتدای کتاب‌ها معمولاً با ترکیب خط ثلث یا نستعلیق و نقوش تذهیب طراحی می‌شدند تا هم عنوان اثر و هم شکوه بصری آن را به نمایش بگذارند.</p><h2>هماهنگی رنگ و ترکیب‌بندی</h2><p>هنرمند خطاط باید فضای کافی برای تذهیب‌کار در نظر می‌گرفت؛ یعنی ترکیب سطرها، حاشیه‌ها و فاصله‌ها از ابتدا با در نظر گرفتن تزیینات بعدی طراحی می‌شد.</p><h2>میراث این همکاری هنری در امروز</h2><p>امروزه در طراحی جلد کتاب، پوسترهای فرهنگی و حتی بسته‌بندی محصولات سنتی، همچنان از ترکیب خط و تذهیب برای رساندن حس اصالت و هویت ایرانی استفاده می‌شود.</p><ul><li>خط و تذهیب، دو هنر مکمل در کتاب‌آرایی</li><li>سرلوح‌ها، نقطه تلاقی خطاطی و نقاشی تزیینی</li><li>کاربرد امروزی در طراحی هویت بصری سنتی</li></ul>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-06",
    tags: ["خطاطی", "تذهیب", "هنر ایرانی"],
    publishedAt: "2026-09-14T08:00:00.000Z",
  },
  {
    title: "معرفی چند استاد بزرگ خط فارسی که سبک نستعلیق را متحول کردند",
    slug: "great-persian-calligraphy-masters",
    excerpt: "در طول تاریخ خطاطی ایران، استادانی ظهور کردند که با نوآوری‌های خود، قواعد و زیبایی‌شناسی نستعلیق را برای همیشه تغییر دادند.",
    content: "<h2>میرعلی تبریزی، بنیان‌گذار قواعد نستعلیق</h2><p>بسیاری از پژوهشگران، میرعلی تبریزی را از نخستین کسانی می‌دانند که قواعد نسبتاً منظمی برای نستعلیق تدوین کرد و پایه‌های این خط را برای نسل‌های بعدی مشخص کرد.</p><h2>میرعماد الحسنی و اوج شکوفایی خط</h2><p>میرعماد در دوران صفوی، خط نستعلیق را به بالاترین سطح زیبایی و توازن رساند. آثار او هنوز هم به‌عنوان معیار اصلی سنجش کیفیت نستعلیق در نظر گرفته می‌شوند.</p><h2>سلطانعلی مشهدی و توسعه خط در خراسان</h2><p>در منطقه خراسان، سلطانعلی مشهدی نقش مهمی در گسترش و آموزش خط نستعلیق داشت و شاگردان زیادی را تربیت کرد که سبک او را در نقاط مختلف ایران رواج دادند.</p><h2>میراث این استادان در آموزش امروزی</h2><p>امروز نیز آموزشگاه‌های خطاطی، آثار این استادان را به‌عنوان سرمشق اصلی تمرین معرفی می‌کنند و هنرجویان با کپی‌برداری از آثار آن‌ها، اصول ترکیب حروف را یاد می‌گیرند.</p><ul><li>میرعلی تبریزی: بنیان‌گذار قواعد اولیه</li><li>میرعماد الحسنی: اوج زیبایی و توازن</li><li>سلطانعلی مشهدی: گسترش آموزش در خراسان</li></ul><p>شناخت آثار این بزرگان، منبع الهام مهمی برای هر هنرجوی جدی خطاطی است.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-07",
    tags: ["خطاطی", "نستعلیق", "استادان خط"],
    publishedAt: "2026-09-15T08:00:00.000Z",
  },
  {
    title: "راهنمای انتخاب مرکب و کاغذ مناسب برای خطاطی حرفه‌ای",
    slug: "choosing-ink-and-paper-for-calligraphy",
    excerpt: "کیفیت مرکب و کاغذ تأثیر مستقیمی روی نتیجه نهایی خط دارد. در این راهنما نکات مهم انتخاب این دو ابزار کلیدی را بررسی می‌کنیم.",
    content: "<h2>ویژگی‌های یک مرکب خوب برای خطاطی</h2><p>مرکب مناسب باید رنگ یکدست، جاری‌شدن روان روی کاغذ و خشک‌شدن مناسب داشته باشد تا لبه‌های حروف تیز و بدون پخش‌شدگی باقی بمانند.</p><h2>تفاوت مرکب چینی و مرکب‌های صنعتی</h2><p>مرکب چینی سنتی معمولاً غلظت بهتری برای خطوط ظریف دارد، در حالی که برخی مرکب‌های صنعتی برای تمرین‌های روزانه و حجم بالای نوشتن اقتصادی‌تر هستند.</p><h2>کاغذ اسطرلاب و اهمیت سطح صیقلی</h2><p>کاغذ اسطرلاب به دلیل سطح نرم و صیقلی، حرکت قلم را بدون گیر کردن یا پخش‌شدن مرکب ممکن می‌کند و برای تمرین حرفه‌ای بسیار توصیه می‌شود.</p><h2>نکاتی برای نگهداری مرکب و کاغذ</h2><p>مرکب باید در ظرف در‌بسته و دور از نور مستقیم نگهداری شود تا غلظت آن تغییر نکند. کاغذها نیز بهتر است در محیط خشک و بدون رطوبت نگهداری شوند تا موج برندارند.</p><ul><li>مرکب یکدست و روان برای لبه‌های تیز</li><li>کاغذ اسطرلاب برای سطح صیقلی مناسب</li><li>نگهداری صحیح، ضامن دوام کیفیت ابزار</li></ul><p>سرمایه‌گذاری روی مرکب و کاغذ مناسب، در بلندمدت روی کیفیت آثار هر خطاط تأثیر مستقیم می‌گذارد.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-08",
    tags: ["خطاطی", "مرکب خطاطی", "راهنمای خرید"],
    publishedAt: "2026-09-16T08:00:00.000Z",
  },
  {
    title: "تمرین‌های پایه برای تازه‌واردان به هنر خط؛ از کجا شروع کنیم؟",
    slug: "basic-calligraphy-exercises-for-beginners",
    excerpt: "شروع درست خطاطی نیازمند تمرین‌های پایه‌ای منظم است. در این مطلب چند تمرین ساده برای هنرجویان تازه‌کار معرفی می‌کنیم.",
    content: "<h2>تمرین کشش خطوط ساده</h2><p>پیش از نوشتن حروف، تمرین کشیدن خطوط افقی، عمودی و مورب با فشار یکنواخت به هنرجو کمک می‌کند تا کنترل دست را روی قلم به دست بیاورد.</p><h2>تمرین حروف منفرد</h2><p>پس از تسلط نسبی بر خطوط ساده، نوبت به تمرین حروف الفبا به‌صورت جداگانه می‌رسد. تمرکز اصلی در این مرحله باید روی تناسب اندازه و زاویه هر حرف باشد.</p><h2>تمرین ترکیب دو و سه حرفی</h2><p>پس از حروف منفرد، ترکیب دو یا سه حرف در قالب کلمات کوتاه، به هنرجو کمک می‌کند نحوه اتصال حروف و رعایت فاصله میان آن‌ها را تجربه کند.</p><h2>اهمیت تکرار و صبر در این مسیر</h2><p>خطاطی هنری است که نتیجه آن به‌سرعت دیده نمی‌شود؛ تکرار روزانه و منظم، حتی برای چند دقیقه، در بلندمدت تأثیر بیشتری نسبت به تمرین‌های نامنظم و طولانی دارد.</p><ul><li>شروع با خطوط ساده افقی و عمودی</li><li>تمرین حروف منفرد پیش از ترکیب</li><li>ترکیب تدریجی حروف در کلمات کوتاه</li><li>تکرار منظم به‌جای تمرین فشرده و نامنظم</li></ul><p>هنرجویانی که این مراحل را با نظم دنبال می‌کنند، معمولاً پیشرفت پایدارتری نسبت به روش‌های شتاب‌زده دارند.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "homepage-09",
    tags: ["خطاطی", "آموزش خطاطی", "تمرین خط"],
    publishedAt: "2026-09-17T08:00:00.000Z",
  },
  {
    title: "خط شکسته نستعلیق چیست و چه تفاوتی با نستعلیق کلاسیک دارد؟",
    slug: "shekasteh-nastaliq-vs-classic-nastaliq",
    excerpt: "شکسته نستعلیق یکی از دشوارترین و در عین حال زیباترین خطوط فارسی است. در این مطلب ویژگی‌های آن را در مقایسه با نستعلیق کلاسیک بررسی می‌کنیم.",
    content: "<h2>پیدایش خط شکسته</h2><p>خط شکسته نستعلیق در ادامه تحول نستعلیق شکل گرفت و هدف اصلی آن، افزایش سرعت نوشتن با حفظ نسبی زیبایی بصری بود؛ به همین دلیل بیشتر در نامه‌نگاری‌های سریع و متون دیوانی رواج داشت.</p><h2>اتصال حروف در شکسته</h2><p>برخلاف نستعلیق کلاسیک که بسیاری از حروف به‌صورت مجزا نوشته می‌شوند، در خط شکسته حروف بیشتری به هم متصل می‌شوند و همین موضوع سرعت نوشتن را بالا می‌برد اما خوانایی آن را نیز کاهش می‌دهد.</p><h2>دشواری یادگیری شکسته نسبت به نستعلیق</h2><p>به دلیل ترکیب‌بندی پیچیده‌تر و اتصال‌های نامتعارف حروف، شکسته نستعلیق معمولاً پس از تسلط کامل بر نستعلیق کلاسیک آموزش داده می‌شود و مسیر یادگیری طولانی‌تری دارد.</p><h2>کاربرد امروزی خط شکسته</h2><p>امروزه خط شکسته کمتر در کتابت رسمی و بیشتر در آثار هنری، امضاهای تزیینی و برخی طراحی‌های گرافیکی خاص که به دنبال حس حرکت و سرعت بصری هستند، به کار می‌رود.</p><ul><li>هدف اصلی: افزایش سرعت نوشتن</li><li>اتصال بیشتر حروف نسبت به نستعلیق کلاسیک</li><li>یادگیری دشوارتر و نیازمند مهارت پیشرفته</li></ul>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "category-fashion-clothing",
    tags: ["خطاطی", "شکسته نستعلیق", "خط فارسی"],
    publishedAt: "2026-09-18T08:00:00.000Z",
  },
  {
    title: "کاربرد خطاطی در طراحی لوگو و هویت بصری امروزی",
    slug: "calligraphy-in-modern-logo-design",
    excerpt: "خط فارسی دیگر فقط به کتابت سنتی محدود نیست؛ امروزه طراحان از قواعد خطاطی برای ساخت لوگو و هویت بصری برندها استفاده می‌کنند.",
    content: "<h2>چرا خط فارسی برای طراحی لوگو جذاب است؟</h2><p>کشیدگی نرم و ریتم بصری خطوط سنتی مانند نستعلیق، حس اصالت و هویت فرهنگی را به برندهایی که به دنبال تمایز هستند منتقل می‌کند؛ چیزی که فونت‌های رایج نمی‌توانند به همان شکل ارائه دهند.</p><h2>چالش استفاده از خط سنتی در طراحی مدرن</h2><p>یکی از دشواری‌های اصلی طراحان، ساده‌سازی خط سنتی بدون از دست دادن اصالت آن است؛ خطی که در اندازه کوچک لوگو یا روی صفحه دیجیتال هم خوانا و زیبا باقی بماند.</p><h2>ترکیب خطاطی دستی با طراحی دیجیتال</h2><p>بسیاری از طراحان امروزی، ابتدا نسخه اولیه لوگو را با خطاطی دستی روی کاغذ اجرا می‌کنند و سپس آن را با ابزارهای دیجیتال بازسازی و بهینه می‌کنند تا هم اصالت خط و هم دقت فنی حفظ شود.</p><h2>نمونه‌هایی از کاربرد در برندسازی ایرانی</h2><p>بسیاری از برندهای فرهنگی، رستوران‌های سنتی و برندهای صنایع‌دستی از خط نستعلیق یا خطوط ترکیبی برای ساخت لوگوی خود استفاده می‌کنند تا از همان نگاه اول، هویت ایرانی برند را به مخاطب منتقل کنند.</p><ul><li>انتقال هویت فرهنگی از طریق خط</li><li>لزوم ساده‌سازی بدون از دست دادن اصالت</li><li>ترکیب خطاطی دستی و ابزار دیجیتال</li></ul><p>خطاطی، به‌عنوان یک میراث فرهنگی، همچنان می‌تواند زبان تصویری تازه‌ای برای برندهای امروزی بسازد.</p>",
    categoryKey: "calligraphy",
    authorKey: "editorial-team",
    coverKey: "category-home-kitchen",
    tags: ["خطاطی", "طراحی لوگو", "هویت بصری"],
    publishedAt: "2026-09-19T08:00:00.000Z",
  },
];

export const generalStoreSeed: DevelopmentStoreSeed = {
  industry: "GENERAL",
  storeName: "فروشگاه توسعه",
  tagline: "انتخاب بهتر برای زندگی روزمره",
  shortDescription: "فروشگاه آزمایشی محصولات عمومی با قیمت ثابت، موجودی و تخفیف زمان‌دار",
  categories: [
    { name: "کالای دیجیتال", slug: "digital-products", description: "لوازم دیجیتال و جانبی پرکاربرد", imageKey: "category-digital-products", attributeSchema: [{ id: "group_digital", name: "مشخصات فنی", attributes: [{ id: "digital_brand", name: "برند" }, { id: "digital_ram", name: "رم" }, { id: "digital_suitable", name: "مناسب برای" }] }] },
    { name: "موبایل", slug: "mobile-phones", parentSlug: "digital-products", description: "گوشی‌های موبایل هوشمند با مشخصات فنی کامل", imageKey: "category-mobile-phones", attributeSchema: mobileAttributeSchema },
    { name: "خانه و آشپزخانه", slug: "home-kitchen", description: "محصولات کاربردی خانه و آشپزخانه", imageKey: "category-home-kitchen", attributeSchema: [{ id: "group_home", name: "مشخصات کلی", attributes: [{ id: "home_material", name: "جنس" }, { id: "home_usage", name: "کاربرد" }] }] },
    { name: "مد و پوشاک", slug: "fashion-clothing", description: "پوشاک و اکسسوری روزمره", imageKey: "category-fashion-clothing", attributeSchema: [{ id: "group_fashion", name: "جزئیات محصول", attributes: [{ id: "fashion_material", name: "جنس پارچه" }, { id: "fashion_suitable", name: "مناسب برای" }] }] },
    { name: "ورزش و سفر", slug: "sport-travel", description: "لوازم ورزشی، کمپ و سفر", imageKey: "category-sport-travel", attributeSchema: [{ id: "group_sport", name: "مشخصات استفاده", attributes: [{ id: "sport_capacity", name: "ظرفیت" }, { id: "sport_usage", name: "مناسب برای" }] }] },
    { name: "زیبایی و سلامت", slug: "beauty-health", description: "محصولات مراقبت شخصی و سلامت", imageKey: "category-beauty-health", attributeSchema: [{ id: "group_beauty", name: "مشخصات مراقبتی", attributes: [{ id: "beauty_skin", name: "نوع پوست" }, { id: "beauty_origin", name: "کشور سازنده" }] }] },
  ],
  brands: generalBrandSeed,
  products: [
    { sku: "DEV-GEN-001", name: "هدفون بی‌سیم نوا", slug: "nova-wireless-headphones", categorySlug: "digital-products", brandSlug: "nova", description: "هدفون بی‌سیم سبک با شارژدهی مناسب استفاده روزمره.", stock: 18, fixedPrice: "32900000", discountPercent: "10", featured: true, attributes: [{ attributeId: "digital_brand", values: ["نوا"] }, { attributeId: "digital_ram", values: ["۱۲ گیگابایت"] }, { attributeId: "digital_suitable", values: ["آقایان", "خانم‌ها"] }], media: [{ key: "product-media-08", isCover: true }, { key: "product-media-15" }, { key: "product-media-16" }] },
    { sku: "DEV-GEN-002", name: "پاوربانک ۲۰ هزار آمپر", slug: "20000mah-power-bank", categorySlug: "digital-products", brandSlug: "energy-plus", description: "پاوربانک دو خروجی با نمایشگر میزان شارژ.", stock: 11, fixedPrice: "24800000", featured: true, attributes: [{ attributeId: "digital_brand", values: ["انرژی پلاس"] }, { attributeId: "digital_suitable", values: ["سفر", "استفاده روزمره"] }], media: [{ key: "product-media-15", isCover: true }, { key: "product-media-16" }, { key: "product-media-08" }] },
    { sku: "DEV-GEN-003", name: "کیبورد مکانیکی مینی", slug: "mini-mechanical-keyboard", categorySlug: "digital-products", brandSlug: "keytech", description: "کیبورد مکانیکی جمع‌وجور مناسب کار و بازی.", stock: 7, fixedPrice: "45900000", attributes: [{ attributeId: "digital_brand", values: ["کی‌تک"] }, { attributeId: "digital_suitable", values: ["کار", "بازی"] }], media: [{ key: "product-media-16", isCover: true }, { key: "product-media-15" }, { key: "product-media-08" }] },
    { sku: "DEV-GEN-004", name: "ماگ حرارتی سرامیکی", slug: "ceramic-thermal-mug", categorySlug: "home-kitchen", brandSlug: "khaneara", description: "ماگ سرامیکی دوجداره مناسب نوشیدنی گرم.", stock: 24, fixedPrice: "8900000", discountPercent: "15", featured: true, attributes: [{ attributeId: "home_material", values: ["سرامیک"] }, { attributeId: "home_usage", values: ["نوشیدنی گرم", "محل کار"] }], media: [{ key: "product-media-09", isCover: true }, { key: "product-media-06" }, { key: "product-media-03" }] },
    { sku: "DEV-GEN-005", name: "ترازو آشپزخانه دیجیتال", slug: "digital-kitchen-scale", categorySlug: "home-kitchen", brandSlug: "khaneara", description: "ترازوی دقیق آشپزخانه با واحدهای اندازه‌گیری متنوع.", stock: 13, fixedPrice: "12700000", media: [{ key: "product-media-03", isCover: true }, { key: "product-media-06" }] },
    { sku: "DEV-GEN-006", name: "چراغ مطالعه تاشو", slug: "foldable-desk-lamp", categorySlug: "home-kitchen", brandSlug: "khaneara", description: "چراغ مطالعه LED با نور قابل تنظیم.", stock: 9, fixedPrice: "16500000", featured: true, media: [{ key: "product-media-06", isCover: true }, { key: "product-media-03" }] },
    { sku: "DEV-GEN-007", name: "هودی پنبه‌ای ساده", slug: "basic-cotton-hoodie", categorySlug: "fashion-clothing", brandSlug: "styleline", description: "هودی پنبه‌ای راحت با دوخت مقاوم.", stock: 16, fixedPrice: "29800000", discountPercent: "20", media: [{ key: "product-media-01", isCover: true }, { key: "product-media-02" }, { key: "product-media-07" }, { key: "product-media-13" }] },
    { sku: "DEV-GEN-008", name: "کیف دوشی مینیمال", slug: "minimal-shoulder-bag", categorySlug: "fashion-clothing", brandSlug: "styleline", description: "کیف دوشی سبک با فضای مناسب وسایل روزمره.", stock: 8, fixedPrice: "21900000", featured: true, media: [{ key: "product-media-13", isCover: true }, { key: "product-media-07" }, { key: "product-media-02" }] },
    { sku: "DEV-GEN-009", name: "قمقمه ورزشی یک لیتری", slug: "one-liter-sport-bottle", categorySlug: "sport-travel", brandSlug: "kouhpeyma", description: "قمقمه ورزشی بدون نشتی و مناسب باشگاه.", stock: 21, fixedPrice: "7400000", media: [{ key: "product-media-11", isCover: true }, { key: "product-media-10" }, { key: "product-media-09" }] },
    { sku: "DEV-GEN-010", name: "کوله پشتی طبیعت‌گردی", slug: "hiking-backpack", categorySlug: "sport-travel", brandSlug: "kouhpeyma", description: "کوله سبک طبیعت‌گردی با بندهای قابل تنظیم.", stock: 6, fixedPrice: "38500000", discountPercent: "8", featured: true, media: [{ key: "product-media-10", isCover: true }, { key: "product-media-11" }, { key: "product-media-09" }] },
    { sku: "DEV-GEN-011", name: "ماساژور دستی شارژی", slug: "rechargeable-hand-massager", categorySlug: "beauty-health", brandSlug: "poustnaz", description: "ماساژور شارژی با چند سطح شدت.", stock: 10, fixedPrice: "27600000", media: [{ key: "product-media-04", isCover: true }, { key: "product-media-12" }] },
    { sku: "DEV-GEN-012", name: "ست مراقبت پوست روزانه", slug: "daily-skincare-set", categorySlug: "beauty-health", brandSlug: "poustnaz", description: "ست آزمایشی مراقبت روزانه پوست شامل سه محصول.", stock: 14, fixedPrice: "34200000", discountPercent: "12", featured: true, media: [{ key: "product-media-12", isCover: true }, { key: "product-media-04" }] },
    { sku: "DEV-GEN-013", name: "گوشی موبایل اپل مدل iPhone 17 CH دو سیم‌کارت ظرفیت ۲۵۶ گیگابایت و رم ۸ گیگابایت", slug: "apple-iphone-17-ch-256gb-8gb", categorySlug: "mobile-phones", brandSlug: "apple", description: "گوشی پرچم‌دار اپل با تراشه A19، نمایشگر LTPO Super Retina XDR OLED و دوربین دوگانه.", stock: 4, fixedPrice: "2859990000", featured: true, attributes: iphone17Attributes, media: [{ key: "product-media-14", isCover: true }, { key: "product-media-17" }, { key: "product-media-05" }] },
  ],
  media: generalMediaSeed,
  brandLogoKey: "brand-logo",
  homepage: {
    heroContentMode: "IMAGE_ONLY",
    heroDesktopKey: "homepage-04",
    heroSlides: [
      { id: "hero-1", href: "/products", desktopKey: "homepage-04" },
      { id: "hero-2", href: "/products", desktopKey: "homepage-05" },
      { id: "hero-3", href: "/products", desktopKey: "homepage-06" },
    ],
    tileGroups: [
      { id: "tile-group-1", layout: "THREE_COLUMNS", tiles: [
        { id: "tile-1-1", href: "/products", key: "homepage-02" },
        { id: "tile-1-2", href: "/products", key: "homepage-05" },
        { id: "tile-1-3", href: "/products", key: "homepage-07" },
      ] },
      { id: "tile-group-2", layout: "TWO_COLUMNS", tiles: [
        { id: "tile-2-1", href: "/products", key: "homepage-06" },
        { id: "tile-2-2", href: "/products", key: "homepage-04" },
      ] },
    ],
    promoBannerEnabled: false,
    promoDesktopKey: "homepage-09",
    promoMobileKey: "homepage-09",
  },
  authors: generalAuthorSeed,
  articleCategories: generalArticleCategorySeed,
  articles: generalArticleSeed,
};
