"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Info, Pencil, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { colorFieldLimits, colorSchema } from "@/modules/colors/schemas";
import { BpButton, BpColorField, BpInput, BpSwitch, BpTable, BpTd, BpTh } from "./ui";

type ColorItem = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };
type FieldErrors = Record<string, string>;

/** The form no longer collects an order value — new colors are appended, existing ones are
 * reordered from the table — so it only validates the fields it still owns. */
const colorFormSchema = colorSchema.omit({ sortOrder: true });

const emptyForm = { name: "", hex: "#C9A56A", isActive: true };

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

function ColorSwatchBox({ hex }: { hex: string }) {
  return <span aria-hidden className="bp-frame block h-7 w-7 shrink-0" style={{ background: hex }} />;
}

export function BlueprintColorsView({ colors }: { colors: ColorItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(colors);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy; this render-time sync (not an effect) picks it up without an extra render pass,
  // and still keeps the optimistic reorder from drifting.
  const [prevColors, setPrevColors] = useState(colors);
  if (colors !== prevColors) {
    setPrevColors(colors);
    setItems(colors);
  }
  const [editing, setEditing] = useState<ColorItem | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [hex, setHex] = useState(emptyForm.hex);
  const [isActive, setIsActive] = useState<boolean>(emptyForm.isActive);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ColorItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  function resetForm() {
    setEditing(null);
    setName(emptyForm.name);
    setHex(emptyForm.hex);
    setIsActive(emptyForm.isActive);
    setErrors({});
  }

  function startEdit(color: ColorItem) {
    setEditing(color);
    setName(color.name);
    setHex(color.hex);
    setIsActive(color.isActive);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const validation = colorFormSchema.safeParse({ name, hex, isActive });
    if (!validation.success) {
      const found: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
      return;
    }
    setLoading(true);
    try {
      // New colors join at the end of the list; an edit never touches the color's place in it.
      const nextSortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0;
      const body = editing ? validation.data : { ...validation.data, sortOrder: nextSortOrder };
      await requestJson(editing ? `/api/colors/${editing.id}` : "/api/colors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, { fallbackMessage: "ذخیره رنگ انجام نشد." });
      toast.success(editing ? "تغییرات رنگ ذخیره شد" : "رنگ جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره رنگ انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  /** Renumbers `next` sequentially and pushes only the rows whose position actually moved. */
  async function persistOrder(next: ColorItem[], previous: ColorItem[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/colors/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیره ترتیب رنگ‌ها انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیره ترتیب رنگ‌ها انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  // Rows reorder live as the pointer passes over them; `dragOrigin` keeps the list from before
  // the gesture started, so `endDrag` only has to diff the two snapshots once, on release.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<ColorItem[] | null>(null);

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
      return move(current, from, after ? overIndex : Math.max(0, overIndex));
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
      await requestJson(`/api/colors/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف رنگ ناموفق بود." });
      toast.success("رنگ حذف شد", { description: `رنگ «${deleteTarget.name}» با موفقیت حذف شد.`, timeout: 4000 });
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف رنگ ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="رنگ‌ها" description="رنگ‌های قابل انتخاب برای تنوع محصولات را تعریف و مدیریت کنید." />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام رنگ" required maxLength={colorFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً رزگلد" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpColorField name="hex" label="کد رنگ" required maxLength={colorFieldLimits.hex} value={hex} error={errors.hex} onChange={(next) => { setHex(next); clearError("hex"); }} />
                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیره تغییرات" : "افزودن رنگ"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel>
          {items.length ? (
            <>
              <div className="md:hidden">
                {items.map((color) => (
                  <article
                    key={color.id}
                    draggable={!savingOrder}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(color.id); }}
                    onDragOver={(event) => dragOver(event, color.id)}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={endDrag}
                    className={`flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 ${draggedId === color.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                      <ColorSwatchBox hex={color.hex} />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{color.name}</strong>
                        <span dir="ltr" className="bp-muted block text-right font-mono text-xs">{color.hex}</span>
                      </div>
                      <AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <BpButton isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${color.name}`} onClick={() => startEdit(color)}><Pencil size={14} /></BpButton>
                      <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${color.name}`} onClick={() => { setDeleteError(""); setDeleteTarget(color); }}><Trash2 size={14} /></BpButton>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="colors" entityLabel="رنگ" ids={items.map((color) => color.id)} actions={[{ value: "active:on", label: "فعال‌کردن رنگ‌ها" }, { value: "active:off", label: "غیرفعال‌کردن رنگ‌ها" }]}>
                <p className="m-0 flex items-center gap-1.5 border-b border-[var(--bp-divider)] px-4 py-2 text-[12px] text-[var(--bp-info)]">
                  <Info size={14} className="shrink-0" aria-hidden />
                  با کشیدن ردیف، ترتیب نمایش رنگ‌ها در فروشگاه را تنظیم کنید.
                </p>
                <BpTable ariaLabel="فهرست رنگ‌ها" minWidth={640}>
                  <thead>
                    <tr>
                      <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh className="w-10">رنگ</BpTh>
                      <BpTh>نام</BpTh>
                      <BpTh>کد</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((color) => (
                      <tr
                        key={color.id}
                        draggable={!savingOrder}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(color.id); }}
                        onDragOver={(event) => dragOver(event, color.id)}
                        onDrop={(event) => event.preventDefault()}
                        onDragEnd={endDrag}
                        className={draggedId === color.id ? "opacity-50" : undefined}
                      >
                        <BpTd className="w-8 text-center"><span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted inline-flex cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span></BpTd>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={color.id} label={`انتخاب رنگ ${color.name}`} /></BpTd>
                        <BpTd><ColorSwatchBox hex={color.hex} /></BpTd>
                        <BpTd className="max-w-[180px] truncate font-bold" title={color.name}>{color.name}</BpTd>
                        <BpTd className="bp-muted font-mono"><span dir="ltr">{color.hex}</span></BpTd>
                        <BpTd><AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش رنگ" aria-label={`ویرایش ${color.name}`} onClick={() => startEdit(color)}><Pencil size={14} /></BpButton>
                            <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" title="حذف رنگ" aria-label={`حذف ${color.name}`} onClick={() => { setDeleteError(""); setDeleteTarget(color); }}><Trash2 size={14} /></BpButton>
                          </div>
                        </BpTd>
                      </tr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </>
          ) : <AdminEmptyState title="رنگی ثبت نشده" description="اولین رنگ فروشگاه را از فرم کنار جدول ثبت کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این رنگ، دیگر برای تعریف تنوع محصولات قابل انتخاب نخواهد بود."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
