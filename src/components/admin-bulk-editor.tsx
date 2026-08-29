"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Checkbox, toast } from "@heroui/react";
import { CheckSquare, Loader2, TriangleAlert } from "lucide-react";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";
import { AdminTableRefreshButton } from "@/components/admin-table-refresh";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { useAdminTemplate } from "@/components/admin/template-context";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { BpCheckbox } from "@/components/admin/blueprint/ui/checkbox";

type BulkContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  allSelected: boolean;
  partiallySelected: boolean;
};

const BulkContext = createContext<BulkContextValue | null>(null);

type AdminBulkAction = HeroSelectOption & { confirmation?: { title: string; description: string; confirmLabel?: string } };

/**
 * Exported so a caller-owned action rendered beside the toolbar (via `extraAction`) can read the
 * current selection itself, instead of `AdminBulkEditor` having to hand it a render function —
 * a plain function prop is not something a Server Component can pass across to this Client one.
 */
export function useBulkSelection() {
  const context = useContext(BulkContext);
  if (!context) throw new Error("Bulk selection must be used inside AdminBulkEditor");
  return context;
}

export function AdminBulkEditor({ entity, entityLabel, ids, actions, children, desktopClassName = "hidden md:block", onCompleted, extraAction }: { entity: "products" | "categories" | "brands" | "orders" | "users" | "reviews" | "colors" | "optionTypes" | "promotions" | "contactMessages" | "paymentGateways" | "smsProviders" | "smsCampaigns"; entityLabel: string; ids: string[]; actions: AdminBulkAction[]; children: ReactNode; desktopClassName?: string; onCompleted?: (result: { action: string; ids: string[] }) => void; /** A caller-owned action beside the quick-edit control — e.g. products' own bulk-edit modal trigger. Reads the selection itself via `useBulkSelection`. */ extraAction?: ReactNode }) {
  const router = useRouter();
  const template = useAdminTemplate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AdminBulkAction | null>(null);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const partiallySelected = selected.size > 0 && !allSelected;

  const value = useMemo<BulkContextValue>(() => ({
    selected,
    allSelected,
    partiallySelected,
    toggle: (id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    toggleAll: () => setSelected((current) => ids.length > 0 && ids.every((id) => current.has(id)) ? new Set() : new Set(ids)),
  }), [allSelected, ids, partiallySelected, selected]);

  async function apply(selectedAction: string) {
    if (!selected.size || !selectedAction || loading) return false;
    const selectedIds = [...selected];
    setLoading(true);
    try {
      const result = await requestJson<{ updated?: number }>("/api/admin/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, action: selectedAction, ids: selectedIds }) }, { fallbackMessage: "ویرایش گروهی انجام نشد." });
      toast.success("ویرایش گروهی انجام شد", { description: `${Number(result?.updated ?? selected.size).toLocaleString("fa-IR")} ${entityLabel} با موفقیت به‌روزرسانی شد.`, timeout: 4000 });
      setSelected(new Set());
      onCompleted?.({ action: selectedAction, ids: selectedIds });
      router.refresh();
      return true;
    } catch (reason) {
      toast.danger("ویرایش گروهی انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد."), timeout: 5000 });
      return false;
    } finally {
      setAction("");
      setLoading(false);
    }
  }

  return (
    <BulkContext.Provider value={value}>
      <div className={desktopClassName}>
        {template === "BLUEPRINT" ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--bp-divider)] px-4 py-3">
            <div className="me-auto flex items-center gap-4 text-[13px]">
              <div className="flex items-center gap-2 border border-[var(--bp-divider)] px-3 py-1.5"><AdminBulkSelectAll /><span>انتخاب همه</span></div>
              <span className="bp-muted flex items-center gap-2">{loading ? <Loader2 size={16} className="animate-spin text-[var(--bp-accent)]" /> : <CheckSquare size={16} className="text-[var(--bp-accent)]" />}{loading ? "در حال اعمال تغییر..." : selected.size ? `${selected.size.toLocaleString("fa-IR")} ${entityLabel} انتخاب شده` : `برای ویرایش سریع، ${entityLabel} را انتخاب کنید`}</span>
            </div>
            {extraAction}
            <AdminTableRefreshButton />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-white px-4 py-3">
            <div className="ml-auto flex min-h-10 items-center gap-4 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><AdminBulkSelectAll /><span>انتخاب همه</span></div>
              <span className="flex items-center gap-2">{loading ? <Loader2 size={17} className="animate-spin text-[var(--warning)]" /> : <CheckSquare size={17} className="text-[var(--warning)]" />}{loading ? "در حال اعمال تغییر..." : selected.size ? `${selected.size.toLocaleString("fa-IR")} ${entityLabel} انتخاب شده` : `برای ویرایش سریع، ${entityLabel} را انتخاب کنید`}</span>
            </div>
            <HeroSelectField name={`${entity}-bulk-action`} label="ویرایش سریع" value={action} disabled={!selected.size || loading} onValueChange={(value) => { setAction(value); if (!value) return; const selectedAction = actions.find((item) => item.value === value); if (selectedAction?.confirmation) setPendingAction(selectedAction); else void apply(value); }} options={[{ value: "", label: "انتخاب عملیات؛ اعمال خودکار" }, ...actions]} className="w-72" />
            {extraAction}
            <AdminTableRefreshButton className="mb-0.5" />
          </div>
        )}
        {children}
      </div>
      <AdminDialog
        open={Boolean(pendingAction)}
        ariaLabel={pendingAction?.confirmation?.title ?? "تأیید عملیات گروهی"}
        isBusy={loading}
        onClose={() => { setPendingAction(null); setAction(""); }}
        title={<span className="flex items-center gap-2"><TriangleAlert size={17} className="text-[var(--danger)]" />{pendingAction?.confirmation?.title}</span>}
        actions={<>
          <AdminDialogButton variant="danger" isPending={loading} onPress={() => { if (pendingAction) void apply(pendingAction.value).then((success) => { if (success) setPendingAction(null); }); }}>{pendingAction?.confirmation?.confirmLabel ?? "تأیید عملیات"}</AdminDialogButton>
          <AdminDialogButton variant="secondary" isDisabled={loading} onPress={() => { setPendingAction(null); setAction(""); }}>انصراف</AdminDialogButton>
        </>}
      >
        <p className="m-0 text-sm leading-7 text-[var(--muted)]">{pendingAction?.confirmation?.description}</p>
        <strong className="text-sm">{selected.size.toLocaleString("fa-IR")} {entityLabel} انتخاب شده است.</strong>
      </AdminDialog>
    </BulkContext.Provider>
  );
}

function SelectionCheckbox({ checked, indeterminate = false, disabled = false, label, onChange }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  const template = useAdminTemplate();
  if (template === "BLUEPRINT") return <BpCheckbox isSelected={checked} isIndeterminate={indeterminate} isDisabled={disabled} label={label} onChange={onChange} />;
  return <Checkbox isSelected={checked} isIndeterminate={indeterminate} isDisabled={disabled} onChange={onChange}><Checkbox.Content aria-label={label} className="cursor-pointer disabled:cursor-not-allowed"><Checkbox.Control className="size-4 rounded border-2 border-[var(--field-border)] bg-[var(--surface)] text-[var(--accent-foreground)] data-[selected]:border-[var(--accent)] data-[selected]:bg-[var(--accent)]"><Checkbox.Indicator className="grid size-full place-items-center" /></Checkbox.Control></Checkbox.Content></Checkbox>;
}

export function AdminBulkSelectAll() {
  const { allSelected, partiallySelected, toggleAll } = useBulkSelection();
  return <SelectionCheckbox checked={allSelected} indeterminate={partiallySelected} label="انتخاب همه ردیف‌های این صفحه" onChange={toggleAll} />;
}

export function AdminBulkCheckbox({ id, label, disabled = false }: { id: string; label: string; disabled?: boolean }) {
  const { selected, toggle } = useBulkSelection();
  return <SelectionCheckbox checked={selected.has(id)} disabled={disabled} label={label} onChange={() => toggle(id)} />;
}

/**
 * A native `<tr>` that also toggles its own row's selection on a click anywhere inside it,
 * except on an interactive control the row already carries (a link, a button, the checkbox
 * itself) — those keep doing their own thing instead of being swallowed by the row.
 */
export function AdminBulkTr({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { toggle } = useBulkSelection();
  return (
    <tr
      className={`cursor-pointer ${className ?? ""}`.trim()}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a, button, input, label, [role='menu'], [role='menuitem'], [role='menuitemradio']")) return;
        toggle(id);
      }}
    >
      {children}
    </tr>
  );
}

/**
 * Same idea for a React Aria `Table.Row` — its `Row` primitive deliberately excludes a bare
 * `onClick` from its own props, so this wraps a cell's content in a plain clickable element
 * instead of fighting that. Skip it on cells that already carry their own controls.
 */
export function AdminBulkRowArea({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { toggle } = useBulkSelection();
  return (
    <span role="presentation" className={`block cursor-pointer ${className ?? ""}`.trim()} onClick={() => toggle(id)}>
      {children}
    </span>
  );
}
