"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { Search, X } from "lucide-react";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";
import { adminFieldClass } from "@/components/admin-ui";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpButton } from "@/components/admin/blueprint/ui/button";
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
};

export function AdminListFilters({ path, query, queryLabel, queryPlaceholder, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const template = useAdminTemplate();

  const update = useCallback((name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    startTransition(() => router.replace(`${path}${next.size ? `?${next.toString()}` : ""}`, { scroll: false }));
  }, [path, router, searchParams]);

  const updateQuery = useCallback((value: string) => update("q", value), [update]);

  if (template === "BLUEPRINT") {
    // One row: the search takes the slack and the selects sit beside it, since a filter bar of
    // four short controls has no reason to stack. It still wraps on a narrow screen.
    return (
      <div className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
        <DebouncedSearch template={template} initialValue={query} label={queryLabel} placeholder={queryPlaceholder} onSearch={updateQuery} />
        {filters.map((filter) => (
          <BpSelect
            key={filter.name}
            aria-label={filter.label}
            value={filter.value}
            options={filter.options}
            onChange={(event) => update(filter.name, event.target.value)}
            reserveMessage={false}
            wrapperClassName="w-full sm:w-auto"
            className="w-full sm:w-44"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <DebouncedSearch template={template} initialValue={query} label={queryLabel} placeholder={queryPlaceholder} onSearch={updateQuery} />
      {filters.map((filter) => (
        <HeroSelectField key={filter.name} name={filter.name} label={filter.label} value={filter.value} options={filter.options} onValueChange={(value) => update(filter.name, value)} className="w-full sm:w-48" />
      ))}
    </div>
  );
}

function DebouncedSearch({ template, initialValue, label, placeholder, onSearch }: { template: "CLASSIC" | "BLUEPRINT"; initialValue: string; label: string; placeholder: string; onSearch: (value: string) => void }) {
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

  if (template === "BLUEPRINT") {
    return (
      <div className="relative w-full min-w-[180px] sm:w-auto sm:min-w-[220px] sm:flex-1">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--bp-muted)]" size={15} />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={label}
          placeholder={placeholder}
          className="bp-input bp-input-search"
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

  return (
    <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-bold text-slate-600 sm:min-w-[260px]">
      {label}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} />
        <Input value={value} onChange={(event) => setValue(event.target.value)} fullWidth variant="secondary" className={`${adminFieldClass} px-10`} placeholder={placeholder} />
        {value ? (
          <Button
            type="button"
            isIconOnly
            variant="ghost"
            aria-label="پاک‌کردن جستجو"
            onPress={clearSearch}
            className="absolute left-1.5 top-1/2 z-20 h-8 min-h-8 w-8 min-w-8 -translate-y-1/2 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X size={15} />
          </Button>
        ) : null}
      </div>
    </label>
  );
}
