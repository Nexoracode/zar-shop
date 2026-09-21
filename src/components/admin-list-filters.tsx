"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { type HeroSelectOption } from "@/components/hero-select-field";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { AdminTableRefreshButton } from "@/components/admin-table-refresh";
import { BpSelect } from "@/components/admin/blueprint/ui/select";

type Filter = {
  name: string;
  label: string;
  value: string;
  options: HeroSelectOption[];
};

type Props = {
  path: string;
  query: string;
  queryLabel: string;
  queryPlaceholder: string;
  filters: Filter[];
  /** A taller search field — for a list whose search sits alone at the top of its card. */
  large?: boolean;
};

export function AdminListFilters({ path, query, queryLabel, queryPlaceholder, filters, large = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback((name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    startTransition(() => router.replace(`${path}${next.size ? `?${next.toString()}` : ""}`, { scroll: false }));
  }, [path, router, searchParams]);

  const updateQuery = useCallback((value: string) => update("q", value), [update]);

  // One row: the search takes the slack and the selects sit beside it, since a filter bar of
  // four short controls has no reason to stack. It still wraps on a narrow screen.
  return (
    <div className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <DebouncedSearch initialValue={query} label={queryLabel} placeholder={queryPlaceholder} onSearch={updateQuery} large={large} />
      {/* Searching and filtering are two different acts; the rule says so without a label. */}
      {filters.length > 0 && <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-[var(--bp-divider)] sm:block" />}
      {filters.map((filter) => (
        <BpSelect
          key={filter.name}
          aria-label={filter.label}
          value={filter.value}
          options={filter.options}
          onChange={(event) => update(filter.name, event.target.value)}
          reserveMessage={false}
          wrapperClassName="w-full sm:w-auto"
          className={`w-full sm:w-44 ${large ? "bp-input-lg" : ""}`.trim()}
        />
      ))}
      <AdminTableRefreshButton inBar />
    </div>
  );
}

function DebouncedSearch({ initialValue, label, placeholder, onSearch, large }: { initialValue: string; label: string; placeholder: string; onSearch: (value: string) => void; large: boolean }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (value === initialValue) return;
    const timer = window.setTimeout(() => onSearch(value.trim()), 450);
    return () => window.clearTimeout(timer);
  }, [initialValue, onSearch, value]);

  const clearSearch = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className={`bp-input bp-input-search ${large ? "bp-input-search-lg" : ""}`.trim()}
      />
      {value ? (
        <BpButton
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="پاک‌کردن جستجو"
          onClick={clearSearch}
          className="absolute end-1 top-1/2 z-20 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2"
        >
          <X size={14} />
        </BpButton>
      ) : null}
    </div>
  );
}
