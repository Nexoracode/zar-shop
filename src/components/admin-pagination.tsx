"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminPageSizes } from "@/lib/admin-pagination";

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
      next.set("pageSize", String(value));
      next.delete("page");
    } else if (value <= 1) next.delete("page");
    else next.set("page", String(value));
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
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
          <Button key={item} type="button" isIconOnly variant={item === page ? "primary" : "ghost"} aria-label={`صفحه ${item.toLocaleString("fa-IR")}`} onPress={() => update("page", item)} className={`h-9 min-h-9 w-9 min-w-9 text-xs font-bold ${item === page ? "bg-[#172b4d] text-white" : "text-slate-600"}`}>{item.toLocaleString("fa-IR")}</Button>
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
