"use client";

import Link from "next/link";
import { ColorSwatch } from "@heroui/react";
import { Pencil } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-ui";
import { Table, TableBody, TableCell, TableColumn, TableContent, TableHeader, TableRow, TableScrollContainer, TruncatedTextTooltip } from "@/components/hero";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { ColorDeleteButton } from "@/components/color-delete-button";

type ColorItem = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };

export function ColorTable({ colors }: { colors: ColorItem[] }) {
  const cellClass = "border-t border-slate-100 px-3 py-2.5 text-xs";

  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {colors.map((color) => (
          <article key={color.id} className="p-4">
            <div className="flex items-center gap-3">
              <ColorSwatch color={color.hex} size="md" className="shrink-0 shadow ring-1 ring-slate-200" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-slate-700">{color.name}</strong>
                <span dir="ltr" className="block text-right font-mono text-xs text-slate-400">{color.hex}</span>
              </div>
              <AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">ترتیب {color.sortOrder.toLocaleString("fa-IR")}</span>
              <div className="mr-auto flex gap-1">
                <Link href={`/admin/colors/${color.id}/edit`} aria-label={`ویرایش ${color.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-[var(--accent)]"><Pencil size={14} /></Link>
                <ColorDeleteButton id={color.id} name={color.name} iconOnly />
              </div>
            </div>
          </article>
        ))}
      </div>
      <AdminBulkEditor entity="colors" entityLabel="رنگ" ids={colors.map((color) => color.id)} actions={[{ value: "active:on", label: "فعال‌کردن رنگ‌ها" }, { value: "active:off", label: "غیرفعال‌کردن رنگ‌ها" }]}>
        <Table><TableScrollContainer><TableContent aria-label="فهرست رنگ‌ها" className="w-full min-w-[620px]">
          <TableHeader>
            <TableColumn id="select" className="w-12 bg-slate-50 px-3 py-2.5 text-center"><span className="sr-only">انتخاب</span></TableColumn>
            {["رنگ", "نام", "کد", "ترتیب", "وضعیت", "عملیات"].map((head, index) => (
              <TableColumn id={head} key={head} isRowHeader={index === 1} className="bg-slate-50 px-3 py-2.5 text-right text-[11px] font-bold text-slate-500">{head}</TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {colors.map((color) => (
              <TableRow id={color.id} key={color.id} className="transition hover:bg-slate-50/70">
                <TableCell className={`${cellClass} w-12 text-center`}><AdminBulkCheckbox id={color.id} label={`انتخاب رنگ ${color.name}`} /></TableCell>
                <TableCell className={`${cellClass} w-16`}><ColorSwatch color={color.hex} size="sm" className="shadow ring-1 ring-slate-200" /></TableCell>
                <TableCell className={`${cellClass} w-44 max-w-44`}><TruncatedTextTooltip text={color.name} className="max-w-36 font-bold text-slate-700" /></TableCell>
                <TableCell className={`${cellClass} font-mono text-slate-500`}><span dir="ltr">{color.hex}</span></TableCell>
                <TableCell className={`${cellClass} text-slate-500`}>{color.sortOrder.toLocaleString("fa-IR")}</TableCell>
                <TableCell className={cellClass}><AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></TableCell>
                <TableCell className={cellClass}>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/colors/${color.id}/edit`} aria-label={`ویرایش ${color.name}`} title="ویرایش رنگ" className="inline-flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 text-[var(--accent)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"><Pencil size={14} /></Link>
                    <ColorDeleteButton id={color.id} name={color.name} iconOnly />
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
