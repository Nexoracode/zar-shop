"use client";

import { Search, X } from "lucide-react";
import { BpButton } from "./button";
import { BpSelect, type BpSelectOption } from "./select";

export type BpListFilter = {
  /** Stable key for React. */
  name: string;
  ariaLabel: string;
  value: string;
  options: BpSelectOption[];
  onChange: (value: string) => void;
};

/**
 * The shared search + filter bar for client-side admin lists — the small drag-ordered config
 * tables (brands, categories, colours, option types). Same markup and layout as the Blueprint
 * branch of `AdminListFilters`, but driven by local state instead of the URL, since those lists
 * are loaded whole and never paginate.
 */
export function BpListFilters({ query, onQueryChange, searchLabel, searchPlaceholder, filters = [] }: {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  filters?: BpListFilter[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bp-divider)] p-3">
      <div className="relative w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          className="bp-input bp-input-search"
        />
        {query ? (
          <BpButton isIconOnly size="sm" variant="ghost" aria-label="پاک‌کردن جستجو" onClick={() => onQueryChange("")} className="absolute end-1 top-1/2 z-20 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2"><X size={14} /></BpButton>
        ) : null}
      </div>
      {filters.length ? <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-[var(--bp-divider)] sm:block" /> : null}
      {filters.map((filter) => (
        <BpSelect
          key={filter.name}
          aria-label={filter.ariaLabel}
          value={filter.value}
          reserveMessage={false}
          wrapperClassName="w-full sm:w-auto"
          className="w-full sm:w-44"
          onChange={(event) => filter.onChange(event.target.value)}
          options={filter.options}
        />
      ))}
    </div>
  );
}
