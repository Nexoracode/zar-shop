"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminPageSizeCookieMaxAge, adminPageSizeCookieName, adminPageSizes } from "@/lib/admin-pagination";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpSelect } from "@/components/admin/blueprint/ui/select";

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function AdminPagination({ page, pageSize, totalItems, totalPages }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const template = useAdminTemplate();
  const firstItem = totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, totalItems);
  const pages = paginationWindow(page, totalPages);

  function update(name: "page" | "pageSize", value: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (name === "pageSize") {
      document.cookie = `${adminPageSizeCookieName}=${value}; Path=/admin; Max-Age=${adminPageSizeCookieMaxAge}; SameSite=Lax`;
      next.set("pageSize", String(value));
      next.delete("page");
    } else {
      next.delete("pageSize");
      if (value <= 1) next.delete("page");
      else next.set("page", String(value));
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  if (template === "BLUEPRINT") {
    return (
      <footer className={`flex flex-col gap-3 border-t border-[var(--bp-divider)] px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bp-muted">نمایش {firstItem.toLocaleString("fa-IR")} تا {lastItem.toLocaleString("fa-IR")} از {totalItems.toLocaleString("fa-IR")}</span>
          <BpSelect
            aria-label="تعداد ردیف در هر صفحه"
            value={String(pageSize)}
            options={adminPageSizes.map((size) => ({ value: String(size), label: `${size.toLocaleString("fa-IR")} ردیف` }))}
            onChange={(event) => update("pageSize", Number(event.target.value))}
            reserveMessage={false}
            className="min-h-[30px] w-28 py-1"
          />
        </div>
        <div className="flex items-center justify-between gap-1 sm:justify-end">
          {/* In RTL the "previous" arrow points right, matching reading direction. */}
          <BpButton isIconOnly size="sm" aria-label="صفحه قبل" disabled={page <= 1 || isPending} onClick={() => update("page", page - 1)}><ChevronRight size={15} /></BpButton>
          {pages.map((item, index) => item === "ellipsis"
            ? <span key={`ellipsis-${index}`} className="bp-muted grid h-[30px] w-7 place-items-center">…</span>
            : <BpButton key={item} isIconOnly size="sm" variant={item === page ? "primary" : "ghost"} aria-label={`صفحه ${item.toLocaleString("fa-IR")}`} aria-current={item === page ? "page" : undefined} onClick={() => update("page", item)}>{item.toLocaleString("fa-IR")}</BpButton>)}
          <BpButton isIconOnly size="sm" aria-label="صفحه بعد" disabled={page >= totalPages || isPending} onClick={() => update("page", page + 1)}><ChevronLeft size={15} /></BpButton>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${isPending ? "opacity-70" : ""}`} aria-busy={isPending}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">نمایش {firstItem.toLocaleString("fa-IR")} تا {lastItem.toLocaleString("fa-IR")} از {totalItems.toLocaleString("fa-IR")}</span>
        <HeroSelectField name="pageSize" ariaLabel="تعداد ردیف در هر صفحه" value={String(pageSize)} includeEmptyOption={false} options={adminPageSizes.map((size) => ({ value: String(size), label: `${size.toLocaleString("fa-IR")} ردیف` }))} onValueChange={(value) => update("pageSize", Number(value))} className="w-32" />
      </div>
      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <Button type="button" isIconOnly variant="secondary" aria-label="صفحه قبل" isDisabled={page <= 1 || isPending} onPress={() => update("page", page - 1)} className="h-9 min-h-9 w-9 min-w-9 border border-slate-200"><ChevronRight size={16} /></Button>
        {pages.map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`} className="grid h-9 w-8 place-items-center text-slate-400">…</span> : (
          <Button key={item} type="button" isIconOnly variant={item === page ? "primary" : "ghost"} aria-label={`صفحه ${item.toLocaleString("fa-IR")}`} onPress={() => update("page", item)} className={`h-9 min-h-9 w-9 min-w-9 text-xs font-bold ${item === page ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-slate-600"}`}>{item.toLocaleString("fa-IR")}</Button>
        ))}
        <Button type="button" isIconOnly variant="secondary" aria-label="صفحه بعد" isDisabled={page >= totalPages || isPending} onPress={() => update("page", page + 1)} className="h-9 min-h-9 w-9 min-w-9 border border-slate-200"><ChevronLeft size={16} /></Button>
      </div>
    </footer>
  );
}

function paginationWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
