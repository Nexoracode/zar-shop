/*
 * A media asset can be attached in eleven different places. Counting them was spelled out in
 * full in the list route, the delete route and both gallery components, so adding a twelfth
 * relation meant finding four copies. It lives here once instead.
 */

export const mediaUsageSelect = {
  products: true,
  optionGuideProducts: true,
  categories: true,
  homepageHeroDesktop: true,
  homepageHeroMobile: true,
  homepagePromoDesktop: true,
  homepagePromoMobile: true,
  brandMainLogo: true,
  brandDarkLogo: true,
  brandFavicon: true,
  brandSocialImage: true,
} as const;

export type MediaUsageCounts = Record<keyof typeof mediaUsageSelect, number>;

/** How many places currently reference this asset. Zero means it is safe to delete. */
export function mediaUsageCount(counts: MediaUsageCounts) {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}
