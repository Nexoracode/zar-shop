"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { CheckSquare, Loader2 } from "lucide-react";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";

type BulkContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  allSelected: boolean;
  partiallySelected: boolean;
};

const BulkContext = createContext<BulkContextValue | null>(null);

function useBulkSelection() {
  const context = useContext(BulkContext);
  if (!context) throw new Error("Bulk selection must be used inside AdminBulkEditor");
  return context;
}

export function AdminBulkEditor({ entity, entityLabel, ids, actions, children }: { entity: "products" | "categories" | "orders" | "users"; entityLabel: string; ids: string[]; actions: HeroSelectOption[]; children: ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const partiallySelected = selected.size > 0 && !allSelected;

  const value = useMemo<BulkContextValue>(() => ({
    selected,
    allSelected,
    partiallySelected,
    toggle: (id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    toggleAll: () => setSelected(allSelected ? new Set() : new Set(ids)),
  }), [allSelected, ids, partiallySelected, selected]);

  async function apply(selectedAction: string) {
    if (!selected.size || !selectedAction || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, action: selectedAction, ids: [...selected] }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ویرایش گروهی انجام نشد.");
      toast.success("ویرایش گروهی انجام شد", { description: `${Number(result?.updated ?? selected.size).toLocaleString("fa-IR")} ${entityLabel} با موفقیت به‌روزرسانی شد.`, timeout: 4000 });
      setSelected(new Set());
      router.refresh();
    } catch (reason) {
      toast.danger("ویرایش گروهی انجام نشد", { description: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.", timeout: 5000 });
    } finally {
      setAction("");
      setLoading(false);
    }
  }

  return (
    <BulkContext.Provider value={value}>
      <div className="hidden md:block">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <div className="ml-auto flex min-h-10 items-center gap-2 text-xs font-bold text-slate-600">{loading ? <Loader2 size={17} className="animate-spin text-[#9a7434]" /> : <CheckSquare size={17} className="text-[#9a7434]" />}{loading ? "در حال اعمال تغییر..." : selected.size ? `${selected.size.toLocaleString("fa-IR")} ${entityLabel} انتخاب شده` : `برای ویرایش سریع، ${entityLabel} را انتخاب کنید`}</div>
          <HeroSelectField name={`${entity}-bulk-action`} label="ویرایش سریع" value={action} disabled={!selected.size || loading} onValueChange={(value) => { setAction(value); if (value) void apply(value); }} options={[{ value: "", label: "انتخاب عملیات؛ اعمال خودکار" }, ...actions]} className="w-72" />
        </div>
        {children}
      </div>
    </BulkContext.Provider>
  );
}

function SelectionCheckbox({ checked, indeterminate = false, disabled = false, label, onChange }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} aria-label={label} className="h-4 w-4 cursor-pointer accent-[#172b4d] disabled:cursor-not-allowed disabled:opacity-35" />;
}

export function AdminBulkSelectAll() {
  const { allSelected, partiallySelected, toggleAll } = useBulkSelection();
  return <SelectionCheckbox checked={allSelected} indeterminate={partiallySelected} label="انتخاب همه ردیف‌های این صفحه" onChange={toggleAll} />;
}

export function AdminBulkCheckbox({ id, label, disabled = false }: { id: string; label: string; disabled?: boolean }) {
  const { selected, toggle } = useBulkSelection();
  return <SelectionCheckbox checked={selected.has(id)} disabled={disabled} label={label} onChange={() => toggle(id)} />;
}
