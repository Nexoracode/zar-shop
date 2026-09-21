import type { HeroSlideDraft } from "@/modules/page-builder/hero-payload";
import type { BannerSliderConfig } from "@/modules/page-builder/banner-sliders";
import type { BannerLayout } from "@/modules/page-builder/banners";

/** One banner as the builder's forms hold it: the same shape the hero slider's slides use. */
export type BannerItem = HeroSlideDraft;

/** What the builder needs of a set of banners, wherever it is stored (the main slider, a tile row, an added slider). */
export type BannerSet = {
  id: string;
  kind: "hero" | "tiles" | "slider";
  layout: BannerLayout;
  items: BannerItem[];
  /** Hands the new list of banners (and, for looks that can change, the new look) to the page builder's draft. */
  save: (items: BannerItem[], layout: BannerLayout) => void;
};

/** The banners of a tile look are exactly `count`: extra ones are dropped, missing ones start empty. */
export function resizeBannerItems(items: BannerItem[], count: number, newId: () => string): BannerItem[] {
  if (items.length >= count) return items.slice(0, count);
  return [...items, ...Array.from({ length: count - items.length }, () => ({ id: newId(), href: "/products", desktopMedia: null, mobileMedia: null }))];
}

export type TileGroupView = { id: string; layout: string; items: BannerItem[] };

/** The body of the homepage tiles API: every tile row, with its banners as tiles (an empty slot keeps a placeholder link). */
export function tileGroupsPayload(groups: TileGroupView[]) {
  return groups.map((group) => ({
    id: group.id,
    layout: group.layout,
    tiles: group.items.map((item) => ({ id: item.id, href: item.href.trim() || "/products", mediaId: item.desktopMedia?.id ?? null })),
  }));
}

/** The stored form of an added slider. */
export function sliderConfigPayload(layout: BannerLayout, items: BannerItem[]): BannerSliderConfig {
  return {
    layout: layout as BannerSliderConfig["layout"],
    slides: items.map((item) => ({ id: item.id, href: item.href.trim(), desktopMediaId: item.desktopMedia?.id ?? null, mobileMediaId: item.mobileMedia?.id ?? null })),
  };
}
