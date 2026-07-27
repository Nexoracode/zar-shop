"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { RotateCcw, Search } from "lucide-react";
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

  const hasFilters = Boolean(query || filters.some((filter) => filter.value));

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <DebouncedSearch key={query} initialValue={query} label={queryLabel} placeholder={queryPlaceholder} onSearch={(value) => update("q", value)} />
      {filters.map((filter) => (
        <HeroSelectField key={filter.name} name={filter.name} label={filter.label} value={filter.value} options={filter.options} onValueChange={(value) => update(filter.name, value)} className="w-full sm:w-48" />
      ))}
      {hasFilters && (
        <Button type="button" variant="secondary" onPress={() => startTransition(() => router.replace(path, { scroll: false }))} className="min-h-11 gap-2 border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500">
          <RotateCcw size={15} />پاک‌کردن
        </Button>
      )}
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

  return (
    <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-bold text-slate-600 sm:min-w-[260px]">
      {label}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={17} />
        <Input value={value} onChange={(event) => setValue(event.target.value)} fullWidth variant="secondary" className={`${adminFieldClass} pr-10`} placeholder={placeholder} />
      </div>
    </label>
  );
}
