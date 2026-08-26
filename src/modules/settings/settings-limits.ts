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
  heroTitle: 191,
  heroDescription: 500,
  heroButtonLabel: 80,
} as const;
