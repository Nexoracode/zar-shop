import type { IdentityValues } from "@/components/page-builder-identity-dialog";
import type { BannerItem } from "@/modules/page-builder/banner-items";
import type { BannerLayout } from "@/modules/page-builder/banners";
import type { LayoutSection } from "@/modules/page-builder/layout-draft";
import type { ProductListConfig } from "@/modules/page-builder/product-lists";
import type { CategoriesSectionSettings } from "@/modules/page-builder/section-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";

// Nothing the page builder edits reaches the server before "save": a section added in the builder, and every change to
// the content of a section that is already on the page, lives in the browser until then. "Cancel" simply drops it.
// `PendingSections` are the new sections; `ContentEdits` are the changes to existing ones. Saving sends the edits, then
// creates the new sections, then saves the layout that holds them.

export type PendingSection =
  | { kind: "list"; config: ProductListConfig }
  | { kind: "banner"; layout: BannerLayout; items: BannerItem[] };

export type PendingSections = Record<string, PendingSection>;

/** A change to the content of a section that is already on the page, by the section's id (or a key of its own). */
export type ContentEdit =
  | { kind: "list"; config: ProductListConfig }
  | { kind: "banner"; layout: BannerLayout; items: BannerItem[] }
  | { kind: "hero"; items: BannerItem[] }
  | { kind: "tiles"; layout: BannerLayout; items: BannerItem[] }
  | { kind: "categories"; settings: CategoriesSectionSettings }
  | { kind: "identity"; values: IdentityValues }
  | { kind: "menu"; items: HomepageMenuItem[] };

export type ContentEdits = Record<string, ContentEdit>;

// The header's forms aren't sections of their own, so their edits are keyed by these.
export const identityEditKey = "HEADER:identity";
export const menuEditKey = "HEADER:menu";

/** The texts of the main slider that its banner forms don't edit — the draft slider is drawn with them. */
export type HeroContent = { contentMode: "WITH_CONTENT" | "IMAGE_ONLY"; title: string; description: string; buttonLabel: string };

/** What the homepage draws in place of (or next to) the server-rendered sections while the page is being edited. */
export type HostSection = (
  | PendingSection
  | { kind: "hero"; items: BannerItem[]; content: HeroContent }
  | { kind: "tiles"; layout: BannerLayout; items: BannerItem[] }
) & {
  /** An existing section drawn with its edited content: the server-rendered one is hidden. */
  replaces: boolean;
};

export type HostSections = Record<string, HostSection>;

/** The pending sections that are actually on the draft page: in its layout, and not removed from it. */
export function pendingInLayout(pending: PendingSections, layout: LayoutSection[]): PendingSections {
  const onPage = new Set(layout.filter((section) => !section.removed).map((section) => section.id));
  return Object.fromEntries(Object.entries(pending).filter(([id]) => onPage.has(id)));
}

/**
 * Everything the homepage has to draw itself while editing: the new sections, and the existing ones whose content was
 * edited and can be shown from the browser (lists, banners, the main slider, tile rows). Only sections that are on the
 * draft page count.
 */
export function hostSections(pending: PendingSections, edits: ContentEdits, layout: LayoutSection[], hero: HeroContent): HostSections {
  const onPage = new Set(layout.filter((section) => !section.removed).map((section) => section.id));
  const result: HostSections = {};
  for (const [id, section] of Object.entries(pending)) {
    if (onPage.has(id)) result[id] = { ...section, replaces: false };
  }
  for (const [id, edit] of Object.entries(edits)) {
    if (!onPage.has(id)) continue;
    if (edit.kind === "list") result[id] = { kind: "list", config: edit.config, replaces: true };
    else if (edit.kind === "banner") result[id] = { kind: "banner", layout: edit.layout, items: edit.items, replaces: true };
    else if (edit.kind === "tiles") result[id] = { kind: "tiles", layout: edit.layout, items: edit.items, replaces: true };
    else if (edit.kind === "hero") result[id] = { kind: "hero", items: edit.items, content: hero, replaces: true };
  }
  return result;
}

/** Hides the server-rendered version of every section the homepage draws itself from the browser's copy. */
export function replacedSectionsCss(sections: HostSections) {
  return Object.entries(sections)
    .filter(([, section]) => section.replaces)
    .map(([id]) => `[data-builder-section="${id.replace(/["\\]/g, "\\$&")}"]:not([data-builder-draft]){display:none !important;}`)
    .join("");
}
