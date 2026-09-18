"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Filter } from "lucide-react";
import { type HeroSelectOption } from "@/components/hero-select-field";
import { BpPopover } from "@/components/admin/blueprint/ui/popover";

export type AdminColumnFilterGroup = { name: string; label: string; value: string; options: HeroSelectOption[] };

/**
 * A funnel icon beside a table header that opens the filter options for that column, instead of
 * a row of comboboxes above the table. Each entry in `groups` is one URL search param the table
 * already reads server-side (same params `AdminListFilters` used to drive) — a column whose icon
 * covers more than one group (e.g. a "product" column standing in for both "featured" and
 * "discount") lists them as separate labeled sections in the same popover.
 */
export function AdminColumnFilter({ path, groups, ariaLabel }: { path: string; groups: AdminColumnFilterGroup[]; ariaLabel: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = groups.some((group) => group.value);

  function choose(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    router.replace(`${path}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  return (
    <>
      {/*
        A bare native button, not `BpButton`: its `.bp-btn-icon` class fixes every icon button at
        36px, which reads as oversized crammed into an 11px uppercase header row. This one only
        ever needs to be as big as the funnel glyph itself.
      */}
      <button
        ref={triggerRef}
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`ms-1 inline-flex size-4 shrink-0 items-center justify-center border-none bg-transparent p-0 ${active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)] hover:text-[var(--bp-text)]"}`}
      >
        <Filter size={12} strokeWidth={1.8} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
      </button>
      <BpPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} label={ariaLabel} width={210}>
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.name}>
              {groups.length > 1 && <p className="bp-muted m-0 mb-1 text-[11px]">{group.label}</p>}
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {group.options.map((option) => {
                  const selected = option.value === group.value;
                  return (
                    <li key={option.value || "__all__"}>
                      <button
                        type="button"
                        onClick={() => choose(group.name, option.value)}
                        className={`flex w-full items-center justify-between gap-2 border border-transparent px-2.5 py-1.5 text-start text-[13px] hover:bg-[var(--bp-hover)] ${selected ? "font-bold text-[var(--bp-accent)]" : ""}`}
                      >
                        {option.label}
                        {selected && <Check size={14} strokeWidth={2} className="shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </BpPopover>
    </>
  );
}
