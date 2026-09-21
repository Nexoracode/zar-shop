import { BUILDER_SECTION_ATTRIBUTE } from "@/modules/page-builder/sections";

// The page builder edits the homepage's existing layout model: an ordered list of sections, each
// enabled or not (see `homepageLayoutSettingsInputSchema`). Removing a section flags it `removed` (and
// disables it): it leaves the page for good and the admin layout page no longer lists it.
export type LayoutSection = { id: string; enabled: boolean; removed?: boolean };

export function sectionSelector(id: string) {
  return `[${BUILDER_SECTION_ATTRIBUTE}="${id.replace(/["\\]/g, "\\$&")}"]`;
}

/** Whether the id belongs to the movable/removable layout (the header, footer and promo banner don't). */
export function isLayoutSection(sections: LayoutSection[], id: string) {
  return sections.some((section) => section.id === id);
}

/**
 * Moves a section one step up (-1) or down (+1) past the next section that is actually on the page:
 * enabled and rendered. Skipping the others keeps every click visible. Returns null when there is
 * nothing to swap with.
 */
export function moveSection(sections: LayoutSection[], id: string, direction: -1 | 1, isRendered: (id: string) => boolean) {
  const from = sections.findIndex((section) => section.id === id);
  if (from < 0) return null;
  let to = from + direction;
  while (to >= 0 && to < sections.length && !(sections[to].enabled && isRendered(sections[to].id))) to += direction;
  if (to < 0 || to >= sections.length) return null;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Removes a section from the page. Returns null when the id is unknown or already removed. */
export function removeSection(sections: LayoutSection[], id: string) {
  if (!sections.some((section) => section.id === id && !section.removed)) return null;
  return sections.map((section) => (section.id === id ? { ...section, enabled: false, removed: true } : section));
}

export function sameLayout(a: LayoutSection[], b: LayoutSection[]) {
  return a.length === b.length && a.every((section, index) => section.id === b[index].id && section.enabled === b[index].enabled && Boolean(section.removed) === Boolean(b[index].removed));
}

/**
 * Applies a layout to the already rendered page. The homepage templates lay their sections out in a flex
 * column and position them with `order`, so restating `order` (and hiding disabled ones, or fading them while
 * editing) is all it takes; a stylesheet, unlike editing the elements, is reverted by simply dropping it.
 */
export function layoutCss(sections: LayoutSection[], { editing }: { editing: boolean }) {
  return sections.map((section, index) => {
    const hidden = section.removed || (!section.enabled && !editing);
    const faded = !section.removed && !section.enabled && editing;
    return `${sectionSelector(section.id)}{order:${index} !important;${hidden ? "display:none !important;" : ""}${faded ? "opacity:0.35 !important;" : ""}}`;
  }).join("");
}

/**
 * Whether a section's markup is emitted hidden. Removed sections always are; disabled ones are too, except for
 * viewers who can edit the page: the builder shows those faded so they can be switched back on.
 */
export function isSectionHiddenAtRender(section: LayoutSection | undefined, editable: boolean) {
  return Boolean(section?.removed) || (section?.enabled === false && !editable);
}
