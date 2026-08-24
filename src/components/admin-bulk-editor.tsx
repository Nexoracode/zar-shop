"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Modal, toast } from "@heroui/react";
import { CheckSquare, Loader2, TriangleAlert } from "lucide-react";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";
import { AdminTableRefreshButton } from "@/components/admin-table-refresh";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { useAdminTemplate } from "@/components/admin/template-context";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpCheckbox } from "@/components/admin/blueprint/ui/checkbox";
import { BpDialog } from "@/components/admin/blueprint/ui/dialog";
import { BpSelect } from "@/components/admin/blueprint/ui/select";

type BulkContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  allSelected: boolean;
  partiallySelected: boolean;
};

const BulkContext = createContext<BulkContextValue | null>(null);

type AdminBulkAction = HeroSelectOption & { confirmation?: { title: string; description: string; confirmLabel?: string } };

function useBulkSelection() {
  const context = useContext(BulkContext);
  if (!context) throw new Error("Bulk selection must be used inside AdminBulkEditor");
  return context;
}

export function AdminBulkEditor({ entity, entityLabel, ids, actions, children, desktopClassName = "hidden md:block", onCompleted }: { entity: "products" | "categories" | "orders" | "users" | "reviews" | "colors" | "promotions" | "contactMessages" | "paymentGateways" | "smsProviders" | "smsCampaigns"; entityLabel: string; ids: string[]; actions: AdminBulkAction[]; children: ReactNode; desktopClassName?: string; onCompleted?: (result: { action: string; ids: string[] }) => void }) {
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
            <BpSelect
              aria-label="ویرایش سریع"
              value={action}
              disabled={!selected.size || loading}
              onChange={(event) => { const value = event.target.value; setAction(value); if (!value) return; const selectedAction = actions.find((item) => item.value === value); if (selectedAction?.confirmation) setPendingAction(selectedAction); else void apply(value); }}
              options={[{ value: "", label: "انتخاب عملیات؛ اعمال خودکار" }, ...actions]}
              className="w-72"
            />
            <AdminTableRefreshButton />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-white px-4 py-3">
            <div className="ml-auto flex min-h-10 items-center gap-4 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><AdminBulkSelectAll /><span>انتخاب همه</span></div>
              <span className="flex items-center gap-2">{loading ? <Loader2 size={17} className="animate-spin text-[var(--warning)]" /> : <CheckSquare size={17} className="text-[var(--warning)]" />}{loading ? "در حال اعمال تغییر..." : selected.size ? `${selected.size.toLocaleString("fa-IR")} ${entityLabel} انتخاب شده` : `برای ویرایش سریع، ${entityLabel} را انتخاب کنید`}</span>
            </div>
            <HeroSelectField name={`${entity}-bulk-action`} label="ویرایش سریع" value={action} disabled={!selected.size || loading} onValueChange={(value) => { setAction(value); if (!value) return; const selectedAction = actions.find((item) => item.value === value); if (selectedAction?.confirmation) setPendingAction(selectedAction); else void apply(value); }} options={[{ value: "", label: "انتخاب عملیات؛ اعمال خودکار" }, ...actions]} className="w-72" />
            <AdminTableRefreshButton className="mb-0.5" />
          </div>
        )}
        {children}
      </div>
      {template === "BLUEPRINT" ? (
        <BpDialog
          open={Boolean(pendingAction)}
          labelledBy={`${entity}-bulk-confirm`}
          onClose={() => { if (!loading) { setPendingAction(null); setAction(""); } }}
          title={<span className="flex items-center gap-2"><TriangleAlert size={17} className="text-[var(--bp-danger)]" />{pendingAction?.confirmation?.title}</span>}
          actions={<>
            <BpButton variant="secondary" disabled={loading} onClick={() => { setPendingAction(null); setAction(""); }}>انصراف</BpButton>
            <BpButton variant="danger" isPending={loading} onClick={() => { if (pendingAction) void apply(pendingAction.value).then((success) => { if (success) setPendingAction(null); }); }}>{pendingAction?.confirmation?.confirmLabel ?? "تأیید عملیات"}</BpButton>
          </>}
        >
          <p className="bp-dialog-body">{pendingAction?.confirmation?.description}</p>
          <strong className="text-[13px]">{selected.size.toLocaleString("fa-IR")} {entityLabel} انتخاب شده است.</strong>
        </BpDialog>
      ) : (
      <Modal.Backdrop isOpen={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !loading) { setPendingAction(null); setAction(""); } }} variant="blur">
        <Modal.Container placement="center"><Modal.Dialog aria-label={pendingAction?.confirmation?.title ?? "تأیید عملیات گروهی"} dir="rtl" className="mx-4 max-w-md bg-[var(--surface)]"><Modal.Header className="border-b border-[var(--border)] p-5 pl-14"><Modal.Heading className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]"><TriangleAlert size={18} className="text-rose-600" />{pendingAction?.confirmation?.title}</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="left-4 right-auto" /></Modal.Header><Modal.Body className="p-5 text-sm leading-7 text-[var(--muted)]">{pendingAction?.confirmation?.description}<strong className="mt-3 block text-[var(--foreground)]">{selected.size.toLocaleString("fa-IR")} {entityLabel} انتخاب شده است.</strong></Modal.Body><Modal.Footer className="gap-2 border-t border-[var(--border)] p-4"><Button type="button" variant="danger" isPending={loading} onPress={() => { if (pendingAction) void apply(pendingAction.value).then((success) => { if (success) setPendingAction(null); }); }}>{pendingAction?.confirmation?.confirmLabel ?? "تأیید عملیات"}</Button><Button type="button" variant="secondary" isDisabled={loading} onPress={() => { setPendingAction(null); setAction(""); }}>انصراف</Button></Modal.Footer></Modal.Dialog></Modal.Container>
      </Modal.Backdrop>
      )}
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
