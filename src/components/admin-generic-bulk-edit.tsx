"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ListChecks, TriangleAlert } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { useBulkSelection, type AdminBulkEntity } from "@/components/admin-bulk-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpSelect, type BpSelectOption } from "@/components/admin/blueprint/ui/select";

type AdminBulkConfirmation = { title: string; description: string; confirmLabel?: string };

/** A second-level choice under a change type, e.g. "روشن" under "نمایش ویژه". */
export type AdminBulkChangeOption = { value: string; label: string; confirmation?: AdminBulkConfirmation };

/**
 * One entry in the "نوع تغییر" picker. `options` present → picking this type reveals a second
 * select to choose the actual value (a boolean toggle shown as two options, or a status enum
 * shown as several). `options` absent → the type itself IS the action (a one-click operation like
 * closing a ticket or deleting rows), optionally gated behind its own `confirmation`.
 */
export type AdminBulkChangeType = { value: string; label: string; options?: AdminBulkChangeOption[]; confirmation?: AdminBulkConfirmation };

/**
 * The generic replacement for every table's old "ویرایش سریع" quick-edit combobox: one
 * "ویرایش گروهی" modal, POSTing the exact same `{ entity, action, ids }` shape to the existing
 * `/api/admin/bulk` endpoint every quick-edit action already used — no server changes needed.
 * A table with only one change type skips the outer picker and shows that type's own control
 * directly, so a single-action table (e.g. "بستن تیکت" or "حذف") never shows a one-item dropdown.
 */
function AdminGenericBulkEditModal({ open, entity, entityLabel, ids, changeTypes, onClose, onCompleted }: {
  open: boolean;
  entity: AdminBulkEntity;
  entityLabel: string;
  ids: string[];
  changeTypes: AdminBulkChangeType[];
  onClose: () => void;
  onCompleted: () => void;
}) {
  const router = useRouter();
  const single = changeTypes.length === 1 ? changeTypes[0] : null;
  const [typeValue, setTypeValue] = useState(single?.value ?? "");
  const [optionValue, setOptionValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ value: string; confirmation: AdminBulkConfirmation } | null>(null);

  const selectedType = changeTypes.find((item) => item.value === typeValue) ?? null;
  const selectedOption = selectedType?.options?.find((item) => item.value === optionValue) ?? null;
  const canSubmit = selectedType ? (selectedType.options ? Boolean(optionValue) : true) : false;

  function reset() {
    setTypeValue(single?.value ?? "");
    setOptionValue("");
    setPendingAction(null);
  }

  function close() {
    if (loading) return;
    reset();
    onClose();
  }

  async function apply(action: string) {
    setLoading(true);
    try {
      const result = await requestJson<{ updated?: number }>("/api/admin/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, action, ids }) }, { fallbackMessage: "ویرایش گروهی انجام نشد." });
      toast.success("ویرایش گروهی انجام شد", { description: `${Number(result?.updated ?? ids.length).toLocaleString("fa-IR")} ${entityLabel} با موفقیت به‌روزرسانی شد.`, timeout: 4000 });
      reset();
      onCompleted();
      router.refresh();
    } catch (reason) {
      toast.danger("ویرایش گروهی انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    const action = selectedType?.options ? optionValue : typeValue;
    if (!action) return;
    const confirmation = selectedOption?.confirmation ?? (!selectedType?.options ? selectedType?.confirmation : undefined);
    if (confirmation) { setPendingAction({ value: action, confirmation }); return; }
    void apply(action);
  }

  return (
    <>
      <AdminDialog
        open={open}
        ariaLabel={`ویرایش گروهی ${entityLabel}`}
        title="ویرایش گروهی"
        description={`اعمال روی ${ids.length.toLocaleString("fa-IR")} ${entityLabel} انتخاب‌شده`}
        isBusy={loading}
        onClose={close}
        actions={<>
          <AdminDialogButton variant="primary" isPending={loading} isDisabled={!canSubmit} onPress={submit}>اعمال تغییر</AdminDialogButton>
          <AdminDialogButton variant="secondary" isDisabled={loading} onPress={close}>انصراف</AdminDialogButton>
        </>}
      >
        <div className="grid gap-3">
          {changeTypes.length > 1 && (
            <BpSelect
              label="نوع تغییر"
              value={typeValue}
              onChange={(event) => { setTypeValue(event.target.value); setOptionValue(""); }}
              options={[{ value: "", label: "انتخاب کنید" }, ...changeTypes.map((item) => ({ value: item.value, label: item.label }))] as BpSelectOption[]}
            />
          )}
          {selectedType?.options && (
            <BpSelect
              label={changeTypes.length > 1 ? "مقدار جدید" : selectedType.label}
              value={optionValue}
              onChange={(event) => setOptionValue(event.target.value)}
              options={[{ value: "", label: "انتخاب کنید" }, ...selectedType.options.map((item) => ({ value: item.value, label: item.label }))] as BpSelectOption[]}
            />
          )}
          {selectedType && !selectedType.options && (
            <p className="bp-muted m-0 text-[12px] leading-6">
              {selectedType.confirmation?.description ?? `این عملیات روی ${ids.length.toLocaleString("fa-IR")} ${entityLabel} انتخاب‌شده اعمال می‌شود.`}
            </p>
          )}
        </div>
      </AdminDialog>
      <AdminDialog
        open={Boolean(pendingAction)}
        ariaLabel={pendingAction?.confirmation.title ?? "تأیید عملیات"}
        isBusy={loading}
        onClose={() => setPendingAction(null)}
        title={<span className="flex items-center gap-2"><TriangleAlert size={17} className="text-[var(--danger)]" />{pendingAction?.confirmation.title}</span>}
        actions={<>
          <AdminDialogButton variant="danger" isPending={loading} onPress={() => { if (pendingAction) void apply(pendingAction.value); }}>{pendingAction?.confirmation.confirmLabel ?? "تأیید عملیات"}</AdminDialogButton>
          <AdminDialogButton variant="secondary" isDisabled={loading} onPress={() => setPendingAction(null)}>انصراف</AdminDialogButton>
        </>}
      >
        <p className="m-0 text-sm leading-7 text-[var(--muted)]">{pendingAction?.confirmation.description}</p>
        <strong className="text-sm">{ids.length.toLocaleString("fa-IR")} {entityLabel} انتخاب شده است.</strong>
      </AdminDialog>
    </>
  );
}

/** Sits in a table's selection toolbar (pass as `AdminBulkEditor`'s `extraAction`). */
export function AdminGenericBulkEditButton({ entity, entityLabel, changeTypes, label = "ویرایش گروهی", icon = <ListChecks size={14} /> }: {
  entity: AdminBulkEntity;
  entityLabel: string;
  changeTypes: AdminBulkChangeType[];
  label?: string;
  icon?: ReactNode;
}) {
  const { selected } = useBulkSelection();
  const [open, setOpen] = useState(false);
  const selectedIds = [...selected];
  const disabled = selectedIds.length === 0;

  return (
    <>
      <BpButton variant="secondary" disabled={disabled} onClick={() => setOpen(true)} className="gap-1.5">
        {icon}{label}
      </BpButton>
      <AdminGenericBulkEditModal open={open} entity={entity} entityLabel={entityLabel} ids={selectedIds} changeTypes={changeTypes} onClose={() => setOpen(false)} onCompleted={() => setOpen(false)} />
    </>
  );
}
