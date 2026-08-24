"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { BpButton } from "./button";
import { BpSelect } from "./select";

const pageSizes = [10, 20, 30, 50, 100];

/**
 * Footer strip of a blueprint list: rows-per-page picker on the start side, page stepper on
 * the end side. In RTL the "previous" arrow points right, matching reading direction.
 */
export function BpPagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange, className = "" }: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bp-divider)] px-4 py-3 text-[13px] ${className}`.trim()}>
      {onPageSizeChange ? (
        <div className="flex items-center gap-2">
          <span className="bp-muted">تعداد ردیف در صفحه</span>
          <BpSelect
            label={undefined}
            aria-label="تعداد ردیف در صفحه"
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            options={pageSizes.map((size) => ({ value: String(size), label: size.toLocaleString("fa-IR") }))}
            className="min-h-[30px] w-auto py-1"
          />
        </div>
      ) : <span />}
      <div className="flex items-center gap-2">
        <BpButton isIconOnly size="sm" aria-label="صفحه قبلی" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronRight size={15} />
        </BpButton>
        <span className="bp-muted">صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, totalPages).toLocaleString("fa-IR")}</span>
        <BpButton isIconOnly size="sm" aria-label="صفحه بعدی" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronLeft size={15} />
        </BpButton>
      </div>
    </div>
  );
}
