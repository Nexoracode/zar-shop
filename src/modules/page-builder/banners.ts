// "Banner" is one kind of homepage section with several looks. Its sliders (the main slider and any added ones) rotate
// through banners; its tile looks lay the banners out side by side (they are the homepage's image tile rows). A banner
// is a picture (with an optional smaller one for phones, on sliders) and the link it goes to.

/** The looks, in the order the picker shows them (right to left, row by row). */
export const bannerLayouts = ["SLIDER_WIDE", "SLIDER_CORNER", "SLIDER_TWO_UP", "SLIDER_PEEK", "SINGLE", "TWO_COLUMNS", "BIG_AND_TWO", "FOUR_COLUMNS", "MOSAIC", "THREE_COLUMNS", "TWO_BY_TWO"] as const;
export type BannerLayout = (typeof bannerLayouts)[number];

export const bannerSliderLayouts = ["SLIDER_WIDE", "SLIDER_CORNER", "SLIDER_TWO_UP", "SLIDER_PEEK"] as const;
export type BannerSliderLayout = (typeof bannerSliderLayouts)[number];

/** The tile looks — exactly the layouts an image tile row of the homepage settings can have. */
export const bannerTileLayouts = ["SINGLE", "TWO_COLUMNS", "BIG_AND_TWO", "FOUR_COLUMNS", "MOSAIC", "THREE_COLUMNS", "TWO_BY_TWO"] as const;
export type BannerTileLayout = (typeof bannerTileLayouts)[number];

export const bannerLayoutLabels: Record<BannerLayout, string> = {
  SLIDER_WIDE: "اسلایدر تک‌بنره با فلش‌های کناری",
  SLIDER_CORNER: "اسلایدر تک‌بنره با فلش پایین",
  SLIDER_TWO_UP: "اسلایدر دوبنره",
  SLIDER_PEEK: "اسلایدر با بنرهای نیمه‌پیدا",
  SINGLE: "بنر تکی",
  TWO_COLUMNS: "دو بنر کنار هم",
  BIG_AND_TWO: "یک بنر بزرگ و دو بنر کوچک",
  FOUR_COLUMNS: "چهار بنر کنار هم",
  MOSAIC: "یک بنر بزرگ و سه بنر کوچک",
  THREE_COLUMNS: "سه بنر کنار هم",
  TWO_BY_TWO: "چهار بنر، دو در دو",
};

/** How many banners each tile look shows — the editor resizes to it, it never asks for more or fewer. */
export const bannerTileCount: Record<BannerTileLayout, number> = {
  SINGLE: 1,
  TWO_COLUMNS: 2,
  BIG_AND_TWO: 3,
  FOUR_COLUMNS: 4,
  MOSAIC: 4,
  THREE_COLUMNS: 3,
  TWO_BY_TWO: 4,
};

export function isSliderLayout(layout: string): layout is BannerSliderLayout {
  return (bannerSliderLayouts as readonly string[]).includes(layout);
}

export function isTileLayout(layout: string): layout is BannerTileLayout {
  return (bannerTileLayouts as readonly string[]).includes(layout);
}

/** The sections that are banners: the main slider, the tile rows and the added sliders. */
export function isBannerSectionId(id: string) {
  return id === "HERO" || id.startsWith("TILE_GROUP:") || id.startsWith("BANNER_SLIDER:");
}

/** How many banners a slider may hold. */
export const bannerSliderMaxSlides = 10;
