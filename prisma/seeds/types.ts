import type { StoreIndustry } from "../../generated/prisma/enums";

// Uploaded media (product/category photos, homepage art, brand logo) lives on the FTP host
// independent of the database, so re-seeding only ever lost the DB rows that pointed at it —
// not the files themselves. Seeding MediaAsset rows straight from a known-good snapshot of
// that data avoids re-uploading through the admin panel after every reseed. `key` is a seed-
// only label (never persisted) used to wire a media entry to the category/product/homepage
// slot that references it; the real cuid is only known once the row is actually created.
export type DevelopmentMediaSeed = {
  key: string;
  scope: "CATEGORY" | "PRODUCT" | "HOMEPAGE" | "BRAND" | "PRODUCT_BRAND";
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  url: string;
  storageKey: string;
  title?: string | null;
  mimeType: string;
  sizeBytes: number;
};

export type DevelopmentCategorySeed = {
  name: string;
  slug: string;
  description: string;
  parentSlug?: string;
  imageKey?: string;
  attributeSchema?: Array<{ id: string; name: string; attributes: Array<{ id: string; name: string; important?: boolean }> }>;
};

/** A product manufacturer/atelier (`Brand`) — distinct from the free-text "برند" category
 * attribute some categories below still carry, which is a different, older mechanism. */
export type DevelopmentBrandSeed = {
  name: string;
  slug: string;
  logoKey?: string;
  featured?: boolean;
};

export type DevelopmentProductSeed = {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  // Every seeded product names one, so development data never has a product without a برند.
  brandSlug: string;
  description: string;
  stock: number;
  featured?: boolean;
  fixedPrice?: string;
  weightGrams?: string;
  makingFeePercent?: string;
  discountPercent?: string;
  attributes?: Array<{ attributeId: string; values: string[] }>;
  media?: Array<{ key: string; isCover?: boolean }>;
};

export type DevelopmentHomepageMediaSeed = {
  heroContentMode?: "WITH_CONTENT" | "IMAGE_ONLY";
  heroDesktopKey?: string;
  heroSlides?: Array<{ id: string; href: string; desktopKey: string; mobileKey?: string }>;
  tileGroups?: Array<{ id: string; layout: "TWO_COLUMNS" | "THREE_COLUMNS" | "FOUR_COLUMNS" | "TWO_BY_TWO"; tiles: Array<{ id: string; href: string; key: string }> }>;
  promoBannerEnabled?: boolean;
  promoDesktopKey?: string;
  promoMobileKey?: string;
};

export type DevelopmentStoreSeed = {
  industry: StoreIndustry;
  storeName: string;
  tagline: string;
  shortDescription: string;
  categories: readonly DevelopmentCategorySeed[];
  brands: readonly DevelopmentBrandSeed[];
  products: readonly DevelopmentProductSeed[];
  media?: readonly DevelopmentMediaSeed[];
  brandLogoKey?: string;
  homepage?: DevelopmentHomepageMediaSeed;
};
