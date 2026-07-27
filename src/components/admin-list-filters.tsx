"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { Search, X } from "lucide-react";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";
import { adminFieldClass } from "@/components/admin-ui";

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

  const update = useCallback((name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    startTransition(() => router.replace(`${path}${next.size ? `?${next.toString()}` : ""}`, { scroll: false }));
  }, [path, router, searchParams]);

  const updateQuery = useCallback((value: string) => update("q", value), [update]);

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <DebouncedSearch initialValue={query} label={queryLabel} placeholder={queryPlaceholder} onSearch={updateQuery} />
      {filters.map((filter) => (
        <HeroSelectField key={filter.name} name={filter.name} label={filter.label} value={filter.value} options={filter.options} onValueChange={(value) => update(filter.name, value)} className="w-full sm:w-48" />
      ))}
    </div>
  );
}

function DebouncedSearch({ initialValue, label, placeholder, onSearch }: { initialValue: string; label: string; placeholder: string; onSearch: (value: string) => void }) {
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
            aria-label="پاک‌کردن جست‌وجو"
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
