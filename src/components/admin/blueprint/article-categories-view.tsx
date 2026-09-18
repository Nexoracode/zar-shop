"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { GripVertical, SquarePen, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor, AdminBulkTr } from "@/components/admin-bulk-editor";
import { AdminColumn, AdminColumnSettingsButton, AdminColumnVisibility } from "@/components/admin-column-visibility";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { normalizeSearchText } from "@/lib/text-search";
import { articleCategorySchema, articleFieldLimits } from "@/modules/articles/schemas";
import { BpButton, BpInput, BpListFilters, BpSwitch, BpTable, BpTd, BpTh } from "./ui";

export type ArticleCategoryRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count: { articles: number };
};

type FieldErrors = Record<string, string | undefined>;

const emptyForm = { name: "", slug: "", isActive: true };

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

const ARTICLE_CATEGORIES_TABLE_ID = "articleCategories";

const articleCategoryColumns = [
  { id: "name", label: "نام" },
  { id: "slug", label: "نشانی" },
  { id: "articles", label: "مقالات" },
  { id: "status", label: "وضعیت" },
];

export function BlueprintArticleCategoriesView({ categories, initialHiddenColumns }: { categories: ArticleCategoryRow[]; initialHiddenColumns: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(categories);
  const [prev, setPrev] = useState(categories);
  if (categories !== prev) {
    setPrev(categories);
    setItems(categories);
  }
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<ArticleCategoryRow | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [slug, setSlug] = useState(emptyForm.slug);
  const [isActive, setIsActive] = useState(emptyForm.isActive);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArticleCategoryRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  function resetForm() {
    setEditing(null);
    setName(emptyForm.name);
    setSlug(emptyForm.slug);
    setIsActive(emptyForm.isActive);
    setErrors({});
  }

  function startEdit(category: ArticleCategoryRow) {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setIsActive(category.isActive);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const nextSortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0;
    const body = { name, slug, isActive, sortOrder: editing?.sortOrder ?? nextSortOrder };
    const validation = articleCategorySchema.safeParse(body);
    if (!validation.success) {
      const found: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }
    setLoading(true);
    try {
      await requestJson(editing ? `/api/admin/article-categories/${editing.id}` : "/api/admin/article-categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیرهٔ دسته انجام نشد." });
      toast.success(editing ? "تغییرات دسته ذخیره شد" : "دستهٔ جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیرهٔ دسته انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(next: ArticleCategoryRow[], previous: ArticleCategoryRow[]) {
    const numbered = next.map((item, position) => ({ ...item, sortOrder: position }));
    const changed = numbered.filter((item, position) => previous.find((entry) => entry.id === item.id)?.sortOrder !== position);
    setItems(numbered);
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((item) => requestJson(`/api/admin/article-categories/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }, { fallbackMessage: "ذخیرهٔ ترتیب دسته‌ها انجام نشد." })));
      router.refresh();
    } catch (reason) {
      setItems(previous);
      toast.danger("ذخیرهٔ ترتیب دسته‌ها انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSavingOrder(false);
    }
  }

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOrigin = useRef<ArticleCategoryRow[] | null>(null);

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
      await requestJson(`/api/admin/article-categories/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف دسته ناموفق بود." });
      toast.success("دسته حذف شد", { description: `دستهٔ «${deleteTarget.name}» حذف شد.`, timeout: 4000 });
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف دسته ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  const normalizedQuery = normalizeSearchText(query);
  const filtersActive = Boolean(normalizedQuery || statusFilter);
  const visible = items.filter((category) => {
    if (normalizedQuery && !normalizeSearchText(`${category.name} ${category.slug}`).includes(normalizedQuery)) return false;
    if (statusFilter === "active" && !category.isActive) return false;
    if (statusFilter === "inactive" && category.isActive) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="دسته‌بندی مقالات" description="دسته‌های وبلاگ برای گروه‌بندی و صفحات دسته در `/blog/category`." />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام دسته" required maxLength={articleFieldLimits.categoryName} value={name} error={errors.name} placeholder="مثلاً راهنمای خرید" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpInput name="slug" label="نشانی انگلیسی (Slug)" required dir="ltr" maxLength={articleFieldLimits.categorySlug} value={slug} error={errors.slug} hint="فقط حروف کوچک انگلیسی، رقم و خط تیره" placeholder="buying-guide" onChange={(event) => { setSlug(event.target.value); clearError("slug"); }} />
                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیرهٔ تغییرات" : "افزودن دسته"}</BpButton>
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
                searchLabel="جستجوی دسته"
                searchPlaceholder="جستجو بر اساس نام یا نشانی دسته"
                filters={[
                  { name: "status", ariaLabel: "وضعیت دسته", value: statusFilter, onChange: setStatusFilter, options: [{ value: "", label: "همه وضعیت‌ها" }, { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }] },
                ]}
              />
              {visible.length ? (
                <AdminColumnVisibility tableId={ARTICLE_CATEGORIES_TABLE_ID} columns={articleCategoryColumns} initialHidden={initialHiddenColumns}>
                  <AdminBulkEditor entity="articleCategories" entityLabel="دسته" ids={visible.map((category) => category.id)} actions={[{ value: "active:on", label: "فعال‌کردن دسته‌ها" }, { value: "active:off", label: "غیرفعال‌کردن دسته‌ها" }]} beforeSelectAll={<AdminColumnSettingsButton />}>
                    <p className="m-0 flex items-center gap-1.5 border-b border-[var(--bp-divider)] px-4 py-2 text-[12px] text-[var(--bp-info)]">{filtersActive ? "برای تغییر ترتیب، ابتدا جستجو و فیلترها را پاک کنید." : "با کشیدن ردیف، ترتیب نمایش دسته‌ها را تنظیم کنید."}</p>
                    <BpTable ariaLabel="فهرست دسته‌های مقالات" minWidth={560}>
                      <thead>
                        <tr>
                          <BpTh className="w-8 text-center"><span className="sr-only">جابه‌جایی</span></BpTh>
                          <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                          <AdminColumn id="name"><BpTh>نام</BpTh></AdminColumn>
                          <AdminColumn id="slug"><BpTh>نشانی</BpTh></AdminColumn>
                          <AdminColumn id="articles"><BpTh>مقالات</BpTh></AdminColumn>
                          <AdminColumn id="status"><BpTh>وضعیت</BpTh></AdminColumn>
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
                            <BpTd className="w-10 text-center"><AdminBulkCheckbox id={category.id} label={`انتخاب دستهٔ ${category.name}`} /></BpTd>
                            <AdminColumn id="name"><BpTd className="max-w-[200px] truncate font-bold" title={category.name}>{category.name}</BpTd></AdminColumn>
                            <AdminColumn id="slug"><BpTd className="bp-muted font-mono"><span dir="ltr">{category.slug}</span></BpTd></AdminColumn>
                            <AdminColumn id="articles"><BpTd>{category._count.articles.toLocaleString("fa-IR")}</BpTd></AdminColumn>
                            <AdminColumn id="status"><BpTd><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd></AdminColumn>
                            <BpTd>
                              <div className="flex items-center justify-center gap-1">
                                <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش دسته" aria-label={`ویرایش ${category.name}`} onClick={() => startEdit(category)}><SquarePen size={15} strokeWidth={1.5} /></BpButton>
                                <BpButton isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" title={category._count.articles > 0 ? "دستهٔ دارای مقاله قابل حذف نیست" : "حذف دسته"} aria-label={`حذف ${category.name}`} disabled={category._count.articles > 0} onClick={() => { setDeleteError(""); setDeleteTarget(category); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                              </div>
                            </BpTd>
                          </AdminBulkTr>
                        ))}
                      </tbody>
                    </BpTable>
                  </AdminBulkEditor>
                </AdminColumnVisibility>
              ) : <div className="p-6"><AdminEmptyState title="دسته‌ای پیدا نشد" description="هیچ دسته‌ای با جستجو و فیلترها مطابقت ندارد." /></div>}
            </>
          ) : <AdminEmptyState title="دسته‌ای ثبت نشده" description="اولین دستهٔ وبلاگ را از فرم کنار جدول ثبت کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="این دسته برای همیشه حذف می‌شود."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
