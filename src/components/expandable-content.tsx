"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/** Clamps long content behind a "نمایش بیشتر"/"بستن" toggle instead of always rendering it in
 * full — used for the product description, but generic enough for any long block. */
export function ExpandableContent({ children, collapsedLines = 6 }: { children: React.ReactNode; collapsedLines?: number }) {
  const [expanded, setExpanded] = useState(false);

  return <div className="grid gap-3">
    <div className="relative">
      <div className={expanded ? "" : "overflow-hidden"} style={expanded ? undefined : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: collapsedLines }}>
        {children}
      </div>
      {!expanded && <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />}
    </div>
    <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-[var(--brand-accent)] transition hover:text-[var(--brand-primary)]">
      {expanded ? "بستن" : "نمایش بیشتر"}<ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
  </div>;
}
