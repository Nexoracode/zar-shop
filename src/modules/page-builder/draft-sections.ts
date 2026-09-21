// Sections added from the page builder (product lists, banners) are created on the server while the page is still being
// edited, but they only belong to the page once "save" puts them into the layout. Until then their ids are listed as
// drafts in `pageSectionSettings.DRAFT_SECTIONS`: visitors never see a draft, the layout doesn't pick it up on its own,
// and "cancel" (or an abandoned session) throws it away. Saving a layout that contains a draft's id commits it.

const DRAFTS_KEY = "DRAFT_SECTIONS";
const INSTANCE_KEYS = ["PRODUCT_LISTS", "BANNER_SLIDERS", "CATEGORY_STRIPS"] as const;

function asDocument(stored: unknown): Record<string, unknown> {
  return stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
}

/** The ids of the sections that are still drafts. */
export function readDraftSectionIds(stored: unknown): string[] {
  const value = asDocument(stored)[DRAFTS_KEY];
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

/** The document with `ids` as its drafts (the key is dropped when there are none). */
export function withDraftSectionIds(stored: unknown, ids: string[]): Record<string, unknown> {
  const rest = { ...asDocument(stored) };
  delete rest[DRAFTS_KEY];
  return ids.length ? { ...rest, [DRAFTS_KEY]: [...new Set(ids)] } : rest;
}

/** Marks `id` as a draft. */
export function addDraftSectionId(stored: unknown, id: string): Record<string, unknown> {
  return withDraftSectionIds(stored, [...readDraftSectionIds(stored), id]);
}

/** Commits the drafts that the given layout contains. Returns the new document and the ids that were committed. */
export function commitDraftSections(stored: unknown, layoutIds: string[]): { stored: Record<string, unknown>; committed: string[] } {
  const drafts = readDraftSectionIds(stored);
  const committed = drafts.filter((id) => layoutIds.includes(id));
  return { stored: committed.length ? withDraftSectionIds(stored, drafts.filter((id) => !committed.includes(id))) : asDocument(stored), committed };
}

/** Whether the id is one of the sections the page builder adds (each has a configuration of its own in the settings). */
export function isSectionInstanceId(id: string) {
  return id.startsWith("PRODUCT_LIST:") || id.startsWith("BANNER_SLIDER:") || id.startsWith("CATEGORY_STRIP:");
}

/** Deletes the configuration of the given added sections (and their draft mark, if they still have one). */
export function deleteSectionInstances(stored: unknown, ids: string[]): { stored: Record<string, unknown>; deleted: string[] } {
  const document = asDocument(stored);
  const targets = [...new Set(ids)].filter(isSectionInstanceId);
  if (!targets.length) return { stored: document, deleted: [] };
  const next: Record<string, unknown> = { ...document };
  for (const key of INSTANCE_KEYS) {
    const instances = document[key];
    if (instances && typeof instances === "object" && !Array.isArray(instances)) {
      next[key] = Object.fromEntries(Object.entries(instances).filter(([id]) => !targets.includes(id)));
    }
  }
  return { stored: withDraftSectionIds(next, readDraftSectionIds(document).filter((id) => !targets.includes(id))), deleted: targets };
}

/**
 * Throws away the given drafts: their configuration goes, and so does their draft mark. An id that is not a draft is
 * never touched — a section that is part of the page can't be removed through here.
 */
export function discardDraftSections(stored: unknown, ids: string[]): { stored: Record<string, unknown>; discarded: string[] } {
  const drafts = readDraftSectionIds(stored);
  const discarded = [...new Set(ids)].filter((id) => drafts.includes(id));
  if (!discarded.length) return { stored: asDocument(stored), discarded };
  return { stored: deleteSectionInstances(stored, discarded).stored, discarded };
}
