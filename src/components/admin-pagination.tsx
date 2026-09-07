"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminPageSizeCookieMaxAge, adminPageSizeCookieName, adminPageSizes } from "@/lib/admin-pagination";
import { paginationWindow } from "@/lib/pagination-window";
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
