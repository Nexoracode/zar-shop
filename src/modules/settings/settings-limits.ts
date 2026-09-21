/*
 * Field limits for the store settings, kept apart from the modules that read them.
 *
 * Those modules import `@/lib/db`, and a client component reaching in for a number would drag
 * Prisma — and the MySQL driver's `net`/`tls`/`fs` requires — into the browser bundle. Same split
 * as `products/discount-window.ts` and `media/limits.ts`.
 */

export const generalSettingsFieldLimits = {
  storeName: 120,
  tagline: 191,
  shortDescription: 500,
  supportPhone: 30,
  supportEmail: 191,
  storeAddress: 1000,
  legalIdentifier: 80,
  supportHours: 191,
} as const;

export const homepageFieldLimits = {
  href: 500,
  menuLabel: 80,
  // How many links the top menu may hold.
  menuItems: 20,
  // How many banners the hero slider may hold.
  heroSlides: 10,
  heroTitle: 191,
  heroDescription: 500,
  heroButtonLabel: 80,
} as const;

// The content settings of storefront sections edited from the page builder.
export const pageSectionLimits = {
  // The title of a section (shared by the sections whose title is editable).
  title: 80,
  // The optional rich-text description under a section's title: visible characters, and the markup they come in.
  description: 300,
  descriptionHtml: 3000,
  // How many categories the homepage's category strip may list.
  categoriesMin: 1,
  categoriesMax: 20,
  // How many top-level categories the homepage reads before arranging them (the arrangement happens in memory).
  categoriesPool: 100,
  // How many products a product list may show.
  productListMin: 1,
  productListMax: 24,
} as const;

export const contentFieldLimits = {
  faqQuestion: 300,
  faqAnswer: 3000,
  pageTitle: 191,
} as const;

export const walletSettingsLimits = {
  // A referral reward is store credit, not a real payout — a generous ceiling is still a guard
  // against a fat-fingered extra zero.
  maxRewardAmount: 100_000_000,
  maxMinOrderAmount: 999_999_999_999,
  // Ceiling for a single self-service wallet top-up.
  maxTopupAmount: 500_000_000,
} as const;

export const walletFieldLimits = {
  adjustmentReason: 191,
} as const;

/** Ceiling for a shipping fee or the free-shipping threshold, in rials. Read by the schema and by the form's input, so they cannot drift. */
export const commerceSettingsLimits = { maxAmount: 999_999_999_999_999, defaultFreeShippingThreshold: 100_000_000 } as const;
