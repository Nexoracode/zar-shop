import type { BannerItem } from "@/modules/page-builder/banner-items";
import type { BannerLayout } from "@/modules/page-builder/banners";
import type { LayoutSection } from "@/modules/page-builder/layout-draft";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";

// A section added in the page builder exists only in the browser until "save": nothing is sent to the server when it
// is added or edited, so adding is instant and "cancel" simply drops it. Saving creates the pending sections on the
// server and then saves the layout that contains them.

export type PendingSection =
  | { kind: "list"; config: ProductListConfig }
  | { kind: "banner"; layout: BannerLayout; items: BannerItem[] };

export type PendingSections = Record<string, PendingSection>;

/** The pending sections that are actually on the draft page: in its layout, and not removed from it. */
export function pendingInLayout(pending: PendingSections, layout: LayoutSection[]): PendingSections {
  const onPage = new Set(layout.filter((section) => !section.removed).map((section) => section.id));
  return Object.fromEntries(Object.entries(pending).filter(([id]) => onPage.has(id)));
}
