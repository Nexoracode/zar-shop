import type { ReactNode } from "react";
import { BUILDER_PART_ATTRIBUTE } from "@/modules/page-builder/display-parts";

/**
 * Marks one switchable part of a storefront section (see `display-parts.ts` for the list per section).
 *
 * A part the store owner switched off is left out entirely for ordinary visitors. Viewers who can edit the
 * page still get it rendered, because the page builder previews a part coming back without a reload and hides
 * it with a stylesheet instead. The wrapper is `display: contents` unless a `className` is given, so wrapping
 * does not change the flex/grid layout around it.
 */
export function BuilderPart({ section, id, hidden, editable, className = "contents", children }: { section: string; id: string; hidden: boolean; editable: boolean; className?: string; children: ReactNode }) {
  if (hidden && !editable) return null;
  return <div className={className} {...{ [BUILDER_PART_ATTRIBUTE]: `${section}:${id}` }}>{children}</div>;
}
