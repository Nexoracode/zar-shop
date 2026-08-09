import type { DevelopmentStoreSeed } from "./types";

export const goldStoreSeed: DevelopmentStoreSeed = {
  industry: "GOLD",
  storeName: "زر گالری توسعه",
  tagline: "طلا، روایت ماندگار شما",
  shortDescription: "فروش آزمایشی طلای ۱۸ عیار با قیمت روز، وزن دقیق و فاکتور رسمی",
  categories: [
    { name: "انگشتر طلا", slug: "gold-rings", description: "انگشترهای طلای زنانه و مردانه", attributeSchema: [{ id: "group_ring_design", name: "مشخصات طراحی", attributes: [{ id: "ring_style", name: "سبک", allowsMultiple: false }, { id: "ring_suitable", name: "مناسب برای", allowsMultiple: true }] }] },
    { name: "دستبند طلا", slug: "gold-bracelets", description: "دستبندهای زنجیری و مینیمال طلا", attributeSchema: [{ id: "group_bracelet_design", name: "مشخصات طراحی", attributes: [{ id: "bracelet_style", name: "سبک", allowsMultiple: false }, { id: "bracelet_clasp", name: "نوع قفل", allowsMultiple: false }] }] },
    { name: "گردنبند طلا", slug: "gold-necklaces", description: "گردنبند و زنجیرهای طلای ۱۸ عیار", attributeSchema: [{ id: "group_necklace_design", name: "مشخصات طراحی", attributes: [{ id: "necklace_style", name: "سبک", allowsMultiple: false }, { id: "necklace_suitable", name: "مناسب برای", allowsMultiple: true }] }] },
    { name: "گوشواره طلا", slug: "gold-earrings", description: "گوشواره‌های میخی، حلقه‌ای و آویز", attributeSchema: [{ id: "group_earring_design", name: "مشخصات طراحی", attributes: [{ id: "earring_model", name: "مدل", allowsMultiple: false }, { id: "earring_suitable", name: "مناسب برای", allowsMultiple: true }] }] },
    { name: "مدال و آویز", slug: "gold-pendants", description: "مدال و آویزهای طلای مناسب هدیه", attributeSchema: [{ id: "group_pendant_design", name: "مشخصات طراحی", attributes: [{ id: "pendant_theme", name: "طرح", allowsMultiple: false }, { id: "pendant_suitable", name: "مناسب برای", allowsMultiple: true }] }] },
  ],
  products: [
    { sku: "DEV-GOLD-001", name: "انگشتر طلای مینیمال آوا", slug: "ava-minimal-gold-ring", categorySlug: "gold-rings", description: "انگشتر مینیمال طلای ۱۸ عیار مناسب استفاده روزمره.", stock: 5, weightGrams: "2.150", makingFeePercent: "8.5", featured: true, attributes: [{ attributeId: "ring_style", values: ["مینیمال"] }, { attributeId: "ring_suitable", values: ["خانم‌ها", "استفاده روزمره"] }] },
    { sku: "DEV-GOLD-002", name: "انگشتر طلای نگین‌دار مهتاب", slug: "mahtab-gem-gold-ring", categorySlug: "gold-rings", description: "انگشتر طلای ظریف با طراحی نگین‌دار.", stock: 3, weightGrams: "3.420", makingFeePercent: "11.5", featured: true },
    { sku: "DEV-GOLD-003", name: "انگشتر طلای کارتیه", slug: "cartier-style-gold-ring", categorySlug: "gold-rings", description: "انگشتر طلای ۱۸ عیار با طراحی الهام‌گرفته از کارتیه.", stock: 4, weightGrams: "4.080", makingFeePercent: "9.5" },
    { sku: "DEV-GOLD-004", name: "دستبند طلای ونکلیف", slug: "van-cleef-gold-bracelet", categorySlug: "gold-bracelets", description: "دستبند طلای ظریف با فرم شبدر.", stock: 6, weightGrams: "2.780", makingFeePercent: "12.5", featured: true, attributes: [{ attributeId: "bracelet_style", values: ["کلاسیک"] }, { attributeId: "bracelet_clasp", values: ["خرچنگی"] }] },
    { sku: "DEV-GOLD-005", name: "دستبند طلای زنجیری رها", slug: "raha-chain-gold-bracelet", categorySlug: "gold-bracelets", description: "دستبند زنجیری طلای ۱۸ عیار با قفل مقاوم.", stock: 2, weightGrams: "5.310", makingFeePercent: "7.5" },
    { sku: "DEV-GOLD-006", name: "گردنبند طلای قلب", slug: "heart-gold-necklace", categorySlug: "gold-necklaces", description: "گردنبند طلای قلب مناسب هدیه.", stock: 5, weightGrams: "3.650", makingFeePercent: "10.5", featured: true, attributes: [{ attributeId: "necklace_style", values: ["فانتزی"] }, { attributeId: "necklace_suitable", values: ["خانم‌ها", "هدیه"] }] },
    { sku: "DEV-GOLD-007", name: "گردنبند طلای مروارید", slug: "pearl-gold-necklace", categorySlug: "gold-necklaces", description: "ترکیب طلای ۱۸ عیار و مروارید با طراحی کلاسیک.", stock: 2, weightGrams: "6.240", makingFeePercent: "13.5" },
    { sku: "DEV-GOLD-008", name: "زنجیر طلای فلامینگو", slug: "flamingo-gold-chain", categorySlug: "gold-necklaces", description: "زنجیر طلای سبک و مناسب استفاده روزانه.", stock: 7, weightGrams: "1.890", makingFeePercent: "6.5" },
    { sku: "DEV-GOLD-009", name: "گوشواره طلای حلقه‌ای", slug: "hoop-gold-earrings", categorySlug: "gold-earrings", description: "گوشواره حلقه‌ای طلای ۱۸ عیار با وزن سبک.", stock: 4, weightGrams: "2.460", makingFeePercent: "9.5", featured: true },
    { sku: "DEV-GOLD-010", name: "گوشواره طلای آویز ستاره", slug: "star-drop-gold-earrings", categorySlug: "gold-earrings", description: "گوشواره آویز ستاره‌ای مناسب استایل روزمره.", stock: 3, weightGrams: "3.120", makingFeePercent: "11.5" },
    { sku: "DEV-GOLD-011", name: "مدال طلای ماه", slug: "moon-gold-pendant", categorySlug: "gold-pendants", description: "مدال طلای ماه با طراحی ساده و کم‌اجرت.", stock: 8, weightGrams: "1.250", makingFeePercent: "4.5", featured: true },
    { sku: "DEV-GOLD-012", name: "آویز طلای حرف فارسی", slug: "persian-letter-gold-pendant", categorySlug: "gold-pendants", description: "آویز حرف فارسی از طلای ۱۸ عیار مناسب هدیه شخصی.", stock: 6, weightGrams: "1.780", makingFeePercent: "8.5" },
  ],
};
