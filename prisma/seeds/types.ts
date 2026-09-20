import type { StoreIndustry } from "../../generated/prisma/enums";

// Uploaded media (product/category photos, homepage art, brand logo) lives on the FTP host
// independent of the database, so re-seeding only ever lost the DB rows that pointed at it —
// not the files themselves. Seeding MediaAsset rows straight from a known-good snapshot of
// that data avoids re-uploading through the admin panel after every reseed. `key` is a seed-
// only label (never persisted) used to wire a media entry to the category/product/homepage
// slot that references it; the real cuid is only known once the row is actually created.
export type DevelopmentMediaSeed = {
  key: string;
  scope: "CATEGORY" | "PRODUCT" | "HOMEPAGE" | "BRAND" | "PRODUCT_BRAND" | "ARTICLE" | "ARTICLE_AUTHOR";
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
  fixedPrice?: string;
  weightGrams?: string;
  makingFeePercent?: string;
  discountPercent?: string;
  attributes?: Array<{ attributeId: string; values: string[] }>;
  media?: Array<{ key: string; isCover?: boolean }>;
};

/** A colour in the shared colour library (`Color`). */
export type DevelopmentColorSeed = { name: string; hex: string };

/** A kind of variation (`OptionType`). A COLOR type's `values` are colour names from the colour library. */
export type DevelopmentOptionTypeSeed = { name: string; kind: "COLOR" | "SELECT"; values: readonly string[] };

/** A discount on the combinations that contain every value in `match`; `window` says when it runs, relative to the day the seed runs. */
export type DevelopmentVariantDiscountSeed = {
  match: Readonly<Record<string, string>>;
  percent: number;
  /** "running" has an end date, "open" is a standing sale with no window, "upcoming" is scheduled to start. */
  window: "running" | "open" | "upcoming";
};

/**
 * A general-shop product sold by combination — one row per pairing of the chosen option values,
 * each with its own price, discount and stock. Every type it names must be in `optionTypes`.
 */
export type DevelopmentVariantProductSeed = {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  brandSlug: string;
  description: string;
  /** Base price in rials; a combination adds the surcharge of each value it is made of. */
  price: number;
  types: ReadonlyArray<{ type: string; values: readonly string[] }>;
  /** Percent added to a combination's price for a value, keyed by that value's label. */
  surcharge?: Readonly<Record<string, number>>;
  discounts?: readonly DevelopmentVariantDiscountSeed[];
  /** Combinations with no stock left. */
  soldOut?: ReadonlyArray<Readonly<Record<string, string>>>;
  /** Combinations that exist but are switched off. */
  switchedOff?: ReadonlyArray<Readonly<Record<string, string>>>;
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

export type DevelopmentAuthorSeed = {
  key: string;
  name: string;
  bio?: string;
  avatarKey?: string;
};

export type DevelopmentArticleCategorySeed = {
  key: string;
  name: string;
  slug: string;
};

export type DevelopmentArticleSeed = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryKey: string;
  authorKey: string;
  coverKey?: string;
  tags?: string[];
  publishedAt: string;
};

export type DevelopmentStoreSeed = {
  industry: StoreIndustry;
  storeName: string;
  tagline: string;
  shortDescription: string;
  categories: readonly DevelopmentCategorySeed[];
  brands: readonly DevelopmentBrandSeed[];
  products: readonly DevelopmentProductSeed[];
  /** The colour and option libraries, and products sold by combination (general shops only). */
  colors?: readonly DevelopmentColorSeed[];
  optionTypes?: readonly DevelopmentOptionTypeSeed[];
  variantProducts?: readonly DevelopmentVariantProductSeed[];
  media?: readonly DevelopmentMediaSeed[];
  brandLogoKey?: string;
  homepage?: DevelopmentHomepageMediaSeed;
  authors?: readonly DevelopmentAuthorSeed[];
  articleCategories?: readonly DevelopmentArticleCategorySeed[];
  articles?: readonly DevelopmentArticleSeed[];
};
