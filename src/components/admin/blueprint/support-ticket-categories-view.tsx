"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, Pencil, Tag, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { normalizeSearchText } from "@/lib/text-search";
import { ticketCategorySchema } from "@/modules/tickets/schemas";
import { ticketFieldLimits } from "@/modules/tickets/limits";
import { BpButton, BpInput, BpListFilters, BpSwitch, BpTable, BpTd, BpTh } from "./ui";

export type TicketCategoryRow = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  _count: { tickets: number };
};

type FieldErrors = Record<string, string>;

const emptyForm = { name: "", isActive: true };

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

export function BlueprintSupportTicketCategoriesView({ categories }: { categories: TicketCategoryRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(categories);
  const [prevCategories, setPrevCategories] = useState(categories);
  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setItems(categories);
  }
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<TicketCategoryRow | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [isActive, setIsActive] = useState<boolean>(emptyForm.isActive);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TicketCategoryRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  function resetForm() {
    setEditing(null);
    setName(emptyForm.name);
    setIsActive(emptyForm.isActive);
    setErrors({});
  }

  function startEdit(category: TicketCategoryRow) {
    setEditing(category);
    setName(category.name);
    setIsActive(category.isActive);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const nextSortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0;
    const body = { name, isActive, sortOrder: editing?.sortOrder ?? nextSortOrder };
    const validation = ticketCategorySchema.safeParse(body);
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
      await requestJson(editing ? `/api/support-ticket-categories/${editing.id}` : "/api/support-ticket-categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره موضوع تیکت انجام نشد." });
      toast.success(editing ? "تغییرات موضوع ذخیره شد" : "موضوع جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره موضوع انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(next: TicketCategoryRow[], previous: TicketCategoryRow[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/support-ticket-categories/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیره ترتیب موضوعات انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیره ترتیب انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<TicketCategoryRow[] | null>(null);

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
      await requestJson(`/api/support-ticket-categories/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف موضوع ناموفق بود." });
      toast.success("موضوع حذف شد");
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف موضوع ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  const normalizedQuery = normalizeSearchText(query);
  const filtersActive = Boolean(normalizedQuery || statusFilter);
  const visible = items.filter((category) => {
    if (normalizedQuery && !normalizeSearchText(category.name).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !category.isActive) return false;
    if (statusFilter === "inactive" && category.isActive) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="موضوعات تیکت" description="موضوعاتی که کاربر هنگام ثبت تیکت از پروفایل انتخاب می‌کند را مدیریت کنید." />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام موضوع" required maxLength={ticketFieldLimits.categoryName} value={name} error={errors.name} placeholder="مثلاً سفارش و پرداخت" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال (قابل انتخاب برای کاربر)</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیره تغییرات" : "افزودن موضوع"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel>
          {items.length ? (
            <>
              <BpListFilters
                query={query}
                onQueryChange={setQuery}
                searchLabel="جستجوی موضوع"
                searchPlaceholder="جستجو بر اساس نام موضوع"
                filters={[
                  { name: "status", ariaLabel: "وضعیت موضوع", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] },
                ]}
              />
              {visible.length ? (
              <>
              <div className="md:hidden">
                {visible.map((category) => (
                  <article
                    key={category.id}
                    draggable={!savingOrder && !filtersActive}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(category.id); }}
                    onDragOver={(event) => dragOver(event, category.id)}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={endDrag}
                    className={`flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 ${draggedId === category.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--bp-divider)] bg-white"><Tag size={15} className="text-[var(--bp-muted)]" /></span>
                      <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{category.name}</strong></div>
                      <AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bp-muted text-[11px]">{category._count.tickets.toLocaleString("fa-IR")} تیکت</span>
                      <div className="flex items-center gap-1">
                        <BpButton isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${category.name}`} onClick={() => startEdit(category)}><Pencil size={14} /></BpButton>
                        <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${category.name}`} disabled={category._count.tickets > 0} onClick={() => { setDeleteError(""); setDeleteTarget(category); }}><Trash2 size={14} /></BpButton>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="supportTicketCategories" entityLabel="موضوع" ids={visible.map((category) => category.id)} actions={[{ value: "active:on", label: "فعال‌کردن موضوعات" }, { value: "active:off", label: "غیرفعال‌کردن موضوعات" }]}>
                <p className="m-0 flex items-center gap-1.5 border-b border-[var(--bp-divider)] px-4 py-2 text-[12px] text-[var(--bp-info)]">{filtersActive ? "برای تغییر ترتیب نمایش، ابتدا جستجو و فیلترها را پاک کنید." : "با کشیدن ردیف، ترتیب نمایش موضوعات را تنظیم کنید."}</p>
                <BpTable ariaLabel="فهرست موضوعات تیکت" minWidth={520}>
                  <thead>
                    <tr>
                      <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>نام</BpTh>
                      <BpTh>تیکت‌ها</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((category) => (
                      <AdminBulkTr
                        key={category.id}
                        id={category.id}
                        draggable={!savingOrder && !filtersActive}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; beginDrag(category.id); }}
                        onDragOver={(event) => dragOver(event, category.id)}
                        onDrop={(event) => event.preventDefault()}
                        onDragEnd={endDrag}
                        className={draggedId === category.id ? "opacity-50" : undefined}
                      >
                        <BpTd className="w-8 text-center"><span aria-hidden="true" title="برای جابه‌جایی بکشید" className="bp-muted inline-flex cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span></BpTd>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={category.id} label={`انتخاب موضوع ${category.name}`} /></BpTd>
                        <BpTd className="max-w-[220px] truncate font-bold" title={category.name}>{category.name}</BpTd>
                        <BpTd className="text-[var(--bp-text)]">{category._count.tickets.toLocaleString("fa-IR")}</BpTd>
                        <BpTd><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش موضوع" aria-label={`ویرایش ${category.name}`} onClick={() => startEdit(category)}><Pencil size={14} /></BpButton>
                            <BpButton isIconOnly size="sm" variant="ghost" title={category._count.tickets > 0 ? "موضوع دارای تیکت قابل حذف نیست" : "حذف موضوع"} className="text-[var(--bp-danger)]" aria-label={`حذف ${category.name}`} disabled={category._count.tickets > 0} onClick={() => { setDeleteError(""); setDeleteTarget(category); }}><Trash2 size={14} /></BpButton>
                          </div>
                        </BpTd>
                      </AdminBulkTr>
                    ))}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
              </>
              ) : <div className="p-6"><AdminEmptyState title="موضوعی پیدا نشد" description="هیچ موضوعی با جستجو و فیلترهای انتخابی مطابقت ندارد." /></div>}
            </>
          ) : <AdminEmptyState title="موضوعی ثبت نشده" description="اولین موضوع تیکت را از فرم کنار جدول ثبت کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این موضوع، دیگر برای انتخاب کاربر هنگام ثبت تیکت در دسترس نخواهد بود."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
