"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { optionFieldLimits, optionTypeSchema } from "@/modules/options/schemas";
import { BpButton, BpCheckbox, BpCombobox, BpInput, BpSelect, BpSwitch, BpTable, BpTd, BpTh } from "./ui";

type OptionValueRow = { id: string; label: string; colorId: string | null; hex: string | null; isActive: boolean };
export type OptionTypeRow = {
  id: string;
  name: string;
  kind: "SELECT" | "COLOR";
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  values: OptionValueRow[];
};
type ColorChoice = { id: string; name: string; hex: string };
type FieldErrors = Record<string, string>;
type ValueDraft = { key: string; id?: string; label: string; colorId: string | null; isActive: boolean };

const kindLabels: Record<OptionTypeRow["kind"], string> = { SELECT: "انتخابی", COLOR: "رنگ" };

let rowCounter = 0;
function newValueDraft(): ValueDraft {
  rowCounter += 1;
  return { key: `new-${rowCounter}`, label: "", colorId: null, isActive: true };
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

function ValuePreview({ values }: { values: OptionValueRow[] }) {
  if (!values.length) return <span className="bp-muted">بدون مقدار</span>;
  const shown = values.slice(0, 6);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((value) => (
        <span key={value.id} className="inline-flex items-center gap-1 border border-[var(--bp-divider)] px-2 py-0.5 text-[11px] text-[var(--bp-muted)]">
          {value.hex ? <span aria-hidden className="h-3 w-3 shrink-0 border border-[var(--bp-divider)]" style={{ background: value.hex }} /> : null}
          {value.label}
        </span>
      ))}
      {values.length > shown.length ? <span className="bp-muted text-[11px]">+{(values.length - shown.length).toLocaleString("fa-IR")}</span> : null}
    </div>
  );
}

export function BlueprintOptionTypesView({ types, colors }: { types: OptionTypeRow[]; colors: ColorChoice[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(types);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy; this render-time sync (not an effect) picks it up without an extra render pass.
  const [prevTypes, setPrevTypes] = useState(types);
  if (types !== prevTypes) {
    setPrevTypes(types);
    setItems(types);
  }
  const [editing, setEditing] = useState<OptionTypeRow | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"SELECT" | "COLOR">("SELECT");
  const [isActive, setIsActive] = useState(true);
  const [values, setValues] = useState<ValueDraft[]>([newValueDraft()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OptionTypeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const colorsById = new Map(colors.map((color) => [color.id, color]));

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setKind("SELECT");
    setIsActive(true);
    setValues([newValueDraft()]);
    setErrors({});
    setValueErrors({});
  }

  function startEdit(type: OptionTypeRow) {
    setEditing(type);
    setName(type.name);
    setKind(type.kind);
    setIsActive(type.isActive);
    setValues(type.values.length
      ? type.values.map((value) => ({ key: value.id, id: value.id, label: value.label, colorId: value.colorId, isActive: value.isActive }))
      : [newValueDraft()]);
    setErrors({});
    setValueErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateValue(key: string, patch: Partial<ValueDraft>) {
    setValues((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setValueErrors((current) => (current[key] ? { ...current, [key]: undefined as unknown as string } : current));
  }

  function removeValue(key: string) {
    setValues((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : [newValueDraft()]));
  }

  // A colour value takes its label straight from the colour's name — the admin only picks the
  // colour — so a row counts as filled once it has that pick; a plain value needs typed text.
  const rowFilled = (row: ValueDraft) => (kind === "COLOR" ? Boolean(row.colorId) : Boolean(row.label.trim()));
  const rowLabel = (row: ValueDraft) => (kind === "COLOR" ? colorsById.get(row.colorId ?? "")?.name ?? "" : row.label);

  async function submit() {
    // The form no longer collects an order value — new types are appended, existing ones are
    // reordered from the table — so the position is derived, never typed.
    const nextSortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0;
    const body = {
      name,
      kind,
      isActive,
      sortOrder: editing?.sortOrder ?? nextSortOrder,
      // A row the admin left blank is an unfinished thought, not an empty value.
      values: values
        .filter(rowFilled)
        .map((row) => ({ ...(row.id ? { id: row.id } : {}), label: rowLabel(row), colorId: row.colorId, isActive: row.isActive })),
    };
    const validation = optionTypeSchema.safeParse(body);
    if (!validation.success) {
      const found: FieldErrors = {};
      const foundValues: Record<string, string> = {};
      const keptRows = values.filter(rowFilled);
      for (const issue of validation.error.issues) {
        const [head, index] = issue.path;
        if (head === "values" && typeof index === "number") {
          const row = keptRows[index];
          if (row && !foundValues[row.key]) foundValues[row.key] = issue.message;
        } else if (head === "values") {
          if (!found.values) found.values = issue.message;
        } else {
          const field = String(head ?? "");
          if (field && !found[field]) found[field] = issue.message;
        }
      }
      setErrors(found);
      setValueErrors(foundValues);
      if (found.name) formRef.current?.querySelector<HTMLElement>('[name="name"]')?.focus();
      else if (Object.keys(foundValues).length) formRef.current?.querySelector<HTMLElement>(`[data-value-key="${Object.keys(foundValues)[0]}"] input`)?.focus();
      return;
    }
    setLoading(true);
    try {
      await requestJson(editing ? `/api/option-types/${editing.id}` : "/api/option-types", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره نوع تنوع انجام نشد." });
      toast.success(editing ? "تغییرات نوع تنوع ذخیره شد" : "نوع تنوع جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره نوع تنوع انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  /** Renumbers `next` sequentially and pushes only the rows whose position actually moved. */
  async function persistOrder(next: OptionTypeRow[], previous: OptionTypeRow[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/option-types/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیره ترتیب نوع‌های تنوع انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیره ترتیب نوع‌های تنوع انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  // Rows reorder live as the pointer passes over them; `dragOrigin` keeps the list from before
  // the gesture started, so `endDrag` only has to diff the two snapshots once, on release.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<OptionTypeRow[] | null>(null);

  function beginDrag(id: string) {
    if (savingOrder) return;
    dragOrigin.current = items;
    setDraggedId(id);
  }

  function dragOver(event: DragEvent<HTMLElement>, overId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === overId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > bounds.top + bounds.height / 2;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === draggedId);
      const overIndex = current.findIndex((item) => item.id === overId);
      if (from < 0 || overIndex < 0) return current;
      let target = after ? overIndex + 1 : overIndex;
      if (target > from) target -= 1;
      return move(current, from, target);
    });
  }

  function endDrag() {
    const origin = dragOrigin.current;
    setDraggedId(null);
    dragOrigin.current = null;
    if (origin) void persistOrder(items, origin);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await requestJson(`/api/option-types/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف نوع تنوع ناموفق بود." });
      toast.success("نوع تنوع حذف شد", { description: `نوع «${deleteTarget.name}» با موفقیت حذف شد.`, timeout: 4000 });
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف نوع تنوع ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="انواع تنوع" description="نوع‌هایی مانند رنگ و سایز را یک‌بار با مقادیرشان تعریف کنید تا در فرم هر محصول قابل انتخاب باشند." />

      <div className="grid items-start gap-2 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام نوع تنوع" required maxLength={optionFieldLimits.typeName} value={name} error={errors.name} placeholder="مثلاً رنگ یا سایز" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpSelect name="kind" label="نوع کنترل" value={kind} onChange={(event) => setKind(event.target.value === "COLOR" ? "COLOR" : "SELECT")} options={[{ value: "SELECT", label: "انتخابی (متن)" }, { value: "COLOR", label: "رنگ" }]} />

                <div>
                  <span className="bp-muted mb-1.5 flex items-center justify-between text-[12px] font-bold">
                    <span>مقادیر این نوع</span>
                    <span className="font-normal">{values.filter(rowFilled).length.toLocaleString("fa-IR")} مقدار</span>
                  </span>
                  {errors.values && <p className="m-0 mb-2 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] px-2.5 py-1.5 text-[12px] text-[var(--bp-danger)]">{errors.values}</p>}
                  {kind === "COLOR" && <p className="bp-muted m-0 mb-2 text-[11px]">برای هر مقدار فقط رنگ را انتخاب کنید؛ نام مقدار از نام همان رنگ برداشته می‌شود.</p>}
                  <div className="grid gap-2">
                    {values.map((row) => {
                      const takenElsewhere = new Set(values.filter((other) => other.key !== row.key).map((other) => other.colorId).filter((id): id is string => Boolean(id)));
                      return (
                      <div key={row.key} data-value-key={row.key} className="grid gap-2 border border-[var(--bp-divider)] p-2.5">
                        {kind === "COLOR" ? (
                          <BpCombobox
                            aria-label="رنگ مقدار"
                            value={row.colorId ?? ""}
                            error={valueErrors[row.key]}
                            reserveMessage={false}
                            placeholder="جستجو یا انتخاب رنگ"
                            emptyLabel="رنگی با این نام پیدا نشد"
                            options={colors.filter((color) => !takenElsewhere.has(color.id)).map((color) => ({ value: color.id, label: color.name, color: color.hex }))}
                            onChange={(colorId) => updateValue(row.key, { colorId: colorId || null })}
                          />
                        ) : (
                          <BpInput
                            aria-label="عنوان مقدار"
                            maxLength={optionFieldLimits.valueLabel}
                            value={row.label}
                            error={valueErrors[row.key]}
                            reserveMessage={false}
                            placeholder="مثلاً بزرگ یا M"
                            onChange={(event) => updateValue(row.key, { label: event.target.value })}
                          />
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <BpCheckbox isSelected={row.isActive} label="فعال بودن این مقدار" onChange={() => updateValue(row.key, { isActive: !row.isActive })} />
                          <BpButton type="button" isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف مقدار ${rowLabel(row) || "بدون عنوان"}`} onClick={() => removeValue(row.key)}><Trash2 size={13} /></BpButton>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <BpButton type="button" size="sm" className="mt-2 gap-1.5" onClick={() => setValues((current) => [...current, newValueDraft()])}><Plus size={13} />افزودن مقدار</BpButton>
                </div>

                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیره تغییرات" : "افزودن نوع تنوع"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel>
          {items.length ? (
            <>
              <div className="md:hidden">
                {items.map((type) => (
                  <article
                    key={type.id}
                    draggable={!savingOrder}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(type.id); }}
                    onDragOver={(event) => dragOver(event, type.id)}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={endDrag}
                    className={`flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 ${draggedId === type.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{type.name}</strong>
                        <span className="bp-muted block text-xs">{kindLabels[type.kind]} · {type.values.length.toLocaleString("fa-IR")} مقدار</span>
                      </div>
                      <AdminStatusBadge tone={type.isActive ? "success" : "neutral"}>{type.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <ValuePreview values={type.values} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="bp-muted text-[11px]">{type.productCount.toLocaleString("fa-IR")} محصول</span>
                      <div className="flex items-center gap-1">
                        <BpButton isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${type.name}`} onClick={() => startEdit(type)}><Pencil size={14} /></BpButton>
                        <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${type.name}`} disabled={type.productCount > 0} onClick={() => { setDeleteError(""); setDeleteTarget(type); }}><Trash2 size={14} /></BpButton>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="optionTypes" entityLabel="نوع تنوع" ids={items.map((type) => type.id)} actions={[{ value: "active:on", label: "فعال‌کردن نوع‌ها" }, { value: "active:off", label: "غیرفعال‌کردن نوع‌ها" }]}>
                <p className="m-0 flex items-center gap-1.5 border-b border-[var(--bp-divider)] px-4 py-2 text-[12px] text-[var(--bp-info)]">
                  <Info size={14} className="shrink-0" aria-hidden />
                  با کشیدن ردیف، ترتیب نمایش نوع‌های تنوع را در فرم محصول تنظیم کنید.
                </p>
                <BpTable ariaLabel="فهرست نوع‌های تنوع" minWidth={760}>
                  <thead>
                    <tr>
                      <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>نام</BpTh>
                      <BpTh>نوع</BpTh>
                      <BpTh>مقادیر</BpTh>
                      <BpTh>محصولات</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((type) => (
                      <tr
                        key={type.id}
                        draggable={!savingOrder}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(type.id); }}
                        onDragOver={(event) => dragOver(event, type.id)}
                        onDrop={(event) => event.preventDefault()}
                        onDragEnd={endDrag}
                        className={draggedId === type.id ? "opacity-50" : undefined}
                      >
                        <BpTd className="w-8 text-center"><span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted inline-flex cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span></BpTd>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={type.id} label={`انتخاب نوع تنوع ${type.name}`} /></BpTd>
                        <BpTd className="max-w-[160px] truncate font-bold" title={type.name}>{type.name}</BpTd>
                        <BpTd className="bp-muted">{kindLabels[type.kind]}</BpTd>
                        <BpTd className="max-w-[280px]"><ValuePreview values={type.values} /></BpTd>
                        <BpTd className="text-[var(--bp-text)]">{type.productCount.toLocaleString("fa-IR")}</BpTd>
                        <BpTd><AdminStatusBadge tone={type.isActive ? "success" : "neutral"}>{type.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش نوع تنوع" aria-label={`ویرایش ${type.name}`} onClick={() => startEdit(type)}><Pencil size={14} /></BpButton>
                            <BpButton isIconOnly size="sm" variant="ghost" title={type.productCount > 0 ? "این نوع در محصولی استفاده شده و قابل حذف نیست" : "حذف نوع تنوع"} className="text-[var(--bp-danger)]" aria-label={`حذف ${type.name}`} disabled={type.productCount > 0} onClick={() => { setDeleteError(""); setDeleteTarget(type); }}><Trash2 size={14} /></BpButton>
                          </div>
                        </BpTd>
                      </tr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </>
          ) : <AdminEmptyState title="نوع تنوعی ثبت نشده" description="اولین نوع تنوع مانند رنگ یا سایز را از فرم کنار جدول با مقادیرش تعریف کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این نوع تنوع، مقادیر آن نیز حذف می‌شوند. نوع‌هایی که در محصولی استفاده شده‌اند قابل حذف نیستند."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
