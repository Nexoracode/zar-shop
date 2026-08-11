"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ChevronDown, ChevronUp } from "lucide-react";

type SpecificationGroup = {
  id: string;
  name: string;
  rows: Array<{ label: string; value: string }>;
};

const collapsedRowCount = 4;

export function ProductSpecifications({ groups }: { groups: SpecificationGroup[] }) {
  const [expanded, setExpanded] = useState(false);
  const totalRows = groups.reduce((total, group) => total + group.rows.length, 0);
  const rowLimit = expanded ? totalRows : collapsedRowCount;
  const visibleGroups = groups.reduce<{ groups: SpecificationGroup[]; rowCount: number }>((result, group) => {
    const rows = group.rows.slice(0, Math.max(0, rowLimit - result.rowCount));
    return rows.length ? { groups: [...result.groups, { ...group, rows }], rowCount: result.rowCount + rows.length } : result;
  }, { groups: [], rowCount: 0 }).groups;

  return <div>
    <div id="product-specification-groups" className="grid gap-9">
      {visibleGroups.map((group) => <section key={group.id} className="grid items-start gap-3 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10" aria-labelledby={`specification-group-${group.id}`}>
        <h3 id={`specification-group-${group.id}`} className="m-0 pt-4 text-sm font-normal text-slate-900">{group.name}</h3>
        <dl className="m-0 min-w-0">
          {group.rows.map((row) => <div key={`${group.id}-${row.label}`} className="grid border-b border-slate-100 py-4 sm:grid-cols-[minmax(130px,200px)_minmax(0,1fr)] sm:gap-8">
            <dt className="mb-2 text-xs leading-7 text-slate-400 sm:mb-0">{row.label}</dt>
            <dd className="m-0 break-words text-sm font-normal leading-7 text-slate-800">{row.value}</dd>
          </div>)}
        </dl>
      </section>)}
    </div>
    {totalRows > collapsedRowCount && <Button type="button" size="sm" variant="ghost" aria-expanded={expanded} aria-controls="product-specification-groups" onPress={() => setExpanded((current) => !current)} className="mt-5 min-h-9 gap-1.5 px-0 text-xs font-normal text-sky-600 hover:bg-transparent hover:text-sky-700">
      {expanded ? <><ChevronUp size={14} />بستن</> : <><ChevronDown size={14} />مشاهده بیشتر</>}
    </Button>}
  </div>;
}
