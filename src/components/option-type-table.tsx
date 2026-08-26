"use client";

import Link from "next/link";
import { ColorSwatch } from "@heroui/react";
import { Pencil } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { OptionTypeDeleteButton } from "@/components/option-type-delete-button";

export type OptionTypeItem = {
  id: string;
  name: string;
  kind: "SELECT" | "COLOR";
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  values: Array<{ id: string; label: string; hex: string | null }>;
};

const kindLabels: Record<OptionTypeItem["kind"], string> = { SELECT: "انتخابی", COLOR: "رنگ" };

/** The first few values, so the list says what a type actually offers without opening it. */
function ValuePreview({ type }: { type: OptionTypeItem }) {
  if (!type.values.length) return <span className="text-slate-400">بدون مقدار</span>;
  const shown = type.values.slice(0, 6);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((value) => (
        <span key={value.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          {value.hex ? <ColorSwatch color={value.hex} size="sm" className="h-3 w-3 shadow ring-1 ring-slate-200" /> : null}
          {value.label}
        </span>
      ))}
      {type.values.length > shown.length ? <span className="text-[11px] text-slate-400">+{(type.values.length - shown.length).toLocaleString("fa-IR")}</span> : null}
    </div>
  );
}

export function OptionTypeTable({ types }: { types: OptionTypeItem[] }) {
  const cellClass = "border-t border-slate-100 px-3 py-2.5 text-xs";

  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {types.map((type) => (
          <article key={type.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-slate-700">{type.name}</strong>
                <span className="block text-xs text-slate-400">{kindLabels[type.kind]} · {type.values.length.toLocaleString("fa-IR")} مقدار</span>
              </div>
              <AdminStatusBadge tone={type.isActive ? "success" : "neutral"}>{type.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
            </div>
            <div className="mt-3"><ValuePreview type={type} /></div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">{type.productCount.toLocaleString("fa-IR")} محصول</span>
              <div className="mr-auto flex gap-1">
                <Link href={`/admin/option-types/${type.id}/edit`} aria-label={`ویرایش ${type.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-[var(--accent)]"><Pencil size={14} /></Link>
                <OptionTypeDeleteButton id={type.id} name={type.name} iconOnly />
              </div>
            </div>
          </article>
        ))}
      </div>
      <AdminBulkEditor entity="optionTypes" entityLabel="نوع تنوع" ids={types.map((type) => type.id)} actions={[{ value: "active:on", label: "فعال‌کردن نوع‌ها" }, { value: "active:off", label: "غیرفعال‌کردن نوع‌ها" }]}>
        <Table><TableScrollContainer><TableContent aria-label="فهرست نوع‌های تنوع" className="w-full min-w-[720px]">
          <TableHeader>
            <TableColumn id="select" className="w-12 bg-slate-50 px-3 py-2.5 text-center"><span className="sr-only">انتخاب</span></TableColumn>
            {["نام", "نوع", "مقادیر", "محصولات", "ترتیب", "وضعیت", "عملیات"].map((head, index) => (
              <TableColumn id={head} key={head} isRowHeader={index === 0} className="bg-slate-50 px-3 py-2.5 text-right text-[11px] font-bold text-slate-500">{head}</TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow id={type.id} key={type.id} className="transition hover:bg-slate-50/70">
                <TableCell className={`${cellClass} w-12 text-center`}><AdminBulkCheckbox id={type.id} label={`انتخاب ${type.name}`} /></TableCell>
                <TableCell className={`${cellClass} w-40 max-w-40`}><TruncatedTextTooltip text={type.name} className="max-w-32 font-bold text-slate-700" /></TableCell>
                <TableCell className={`${cellClass} text-slate-500`}>{kindLabels[type.kind]}</TableCell>
                <TableCell className={cellClass}><ValuePreview type={type} /></TableCell>
                <TableCell className={`${cellClass} text-slate-500`}>{type.productCount.toLocaleString("fa-IR")}</TableCell>
                <TableCell className={`${cellClass} text-slate-500`}>{type.sortOrder.toLocaleString("fa-IR")}</TableCell>
                <TableCell className={cellClass}><AdminStatusBadge tone={type.isActive ? "success" : "neutral"}>{type.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></TableCell>
                <TableCell className={cellClass}>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/option-types/${type.id}/edit`} aria-label={`ویرایش ${type.name}`} title="ویرایش نوع تنوع" className="inline-flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 text-[var(--accent)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"><Pencil size={14} /></Link>
                    <OptionTypeDeleteButton id={type.id} name={type.name} iconOnly />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContent></TableScrollContainer></Table>
      </AdminBulkEditor>
    </>
  );
}
