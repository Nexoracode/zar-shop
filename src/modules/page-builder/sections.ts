import type { HomepageLayoutItemId, HomepageSectionId } from "@/modules/settings/homepage-settings";

// Every part of the storefront the page builder can select carries this attribute, holding one of
// the ids below. The builder finds sections purely through the DOM, so a template opts a block in
// just by spreading `builderSectionProps(id)` on its root element.
export const BUILDER_SECTION_ATTRIBUTE = "data-builder-section";
export const BUILDER_SECTION_SELECTOR = `[${BUILDER_SECTION_ATTRIBUTE}]`;

export type BuilderSectionId = HomepageLayoutItemId | "PROMO_BANNER" | "HEADER" | "FOOTER";

const homepageSectionLabels: Record<HomepageSectionId, string> = {
  HERO: "اسلایدر اصلی",
  CATEGORIES: "دسته‌بندی‌های منتخب",
  BRANDS: "محبوب‌ترین برندها",
  FEATURED_PRODUCTS: "پیشنهادهای شگفت‌انگیز",
  POPULAR_PRODUCTS: "محبوب‌ترین محصولات",
  BEST_SELLING_PRODUCTS: "پرفروش‌ترین محصولات",
  LATEST_PRODUCTS: "جدیدترین محصولات",
  ABOUT: "معرفی فروشگاه",
  PROMISES: "مزیت‌های خرید",
  CONCIERGE: "خدمات اختصاصی",
  ARTICLES: "آخرین مقالات وبلاگ",
};

const chromeSectionLabels = { PROMO_BANNER: "بنر تبلیغاتی", HEADER: "سربرگ", FOOTER: "پاورقی" } as const;

export function builderSectionProps(id: BuilderSectionId) {
  return { [BUILDER_SECTION_ATTRIBUTE]: id } as const;
}

export function builderSectionLabel(id: string | undefined) {
  if (!id) return "بخش";
  if (id.startsWith("TILE_GROUP:")) return "ردیف تصاویر";
  if (id.startsWith("PRODUCT_LIST:")) return "لیست محصولات";
  return (homepageSectionLabels as Record<string, string>)[id] ?? (chromeSectionLabels as Record<string, string>)[id] ?? "بخش";
}
