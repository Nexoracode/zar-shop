"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { FolderTree, Images, Pencil, SlidersHorizontal, Star, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { categoryFieldLimits, categorySchema } from "@/modules/categories/schemas";
import { wouldCreateCategoryCycle } from "@/modules/categories/category-tree";
import { BpButton, BpCombobox, BpInput, BpNumberInput, BpSwitch, BpTable, BpTd, BpTextarea, BpTh } from "./ui";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  image: { id: string; url: string; alt: string | null } | null;
  _count: { products: number; children: number };
};

type FieldErrors = Record<string, string>;

const emptyForm = { name: "", slug: "", description: "", parentId: "", isActive: true, featured: false };

function Panel({ children }: { children: ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

function CategoryThumb({ image, name }: { image: CategoryRow["image"]; name: string }) {
  return <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden border border-[var(--bp-divider)] bg-white">{image ? <Image src={image.url} alt={image.alt ?? name} fill sizes="36px" className="object-cover" /> : <FolderTree size={15} className="text-[var(--bp-muted)]" />}</span>;
}

export function BlueprintCategoriesView({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(categories);
  // The server list is the source of truth once a mutation settles and `router.refresh()` brings
  // a fresh copy; this render-time sync (not an effect) picks it up without an extra render pass.
  const [prevCategories, setPrevCategories] = useState(categories);
  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setItems(categories);
  }
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [slug, setSlug] = useState(emptyForm.slug);
  const [description, setDescription] = useState(emptyForm.description);
  const [parentId, setParentId] = useState(emptyForm.parentId);
  const [sortOrder, setSortOrder] = useState("0");
  const [image, setImage] = useState<MediaChoice | null>(null);
  const [isActive, setIsActive] = useState<boolean>(emptyForm.isActive);
  const [featured, setFeatured] = useState<boolean>(emptyForm.featured);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // A category cannot become its own descendant's child — offering one here would only fail once
  // submitted, on the server's own check of the exact same rule.
  const parentOptions = items
    .filter((item) => !editing || (item.id !== editing.id && !wouldCreateCategoryCycle(editing.id, item.id, items)))
    .map((item) => ({ value: item.id, label: item.parentName ? `${item.parentName} ← ${item.name}` : item.name }));

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  function resetForm() {
    setEditing(null);
    setName(emptyForm.name);
    setSlug(emptyForm.slug);
    setDescription(emptyForm.description);
    setParentId(emptyForm.parentId);
    setSortOrder("0");
    setImage(null);
    setIsActive(emptyForm.isActive);
    setFeatured(emptyForm.featured);
    setErrors({});
  }

  function startEdit(category: CategoryRow) {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setParentId(category.parentId ?? "");
    setSortOrder(String(category.sortOrder));
    setImage(category.image ? { id: category.image.id, title: category.name, url: category.image.url, alt: category.image.alt, type: "IMAGE" } : null);
    setIsActive(category.isActive);
    setFeatured(category.featured);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const body = {
      name, slug, description: description.trim() || null, parentId: parentId || null, imageId: image?.id ?? null,
      isActive, featured, sortOrder: Number(sortOrder) || 0,
    };
    const validation = categorySchema.safeParse(body);
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
      await requestJson(editing ? `/api/categories/${editing.id}` : "/api/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره دسته‌بندی انجام نشد." });
      toast.success(editing ? "تغییرات دسته‌بندی ذخیره شد" : "دسته‌بندی جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره دسته‌بندی انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await requestJson(`/api/categories/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف دسته‌بندی ناموفق بود." });
      toast.success("دسته‌بندی حذف شد", { description: `دسته‌بندی «${deleteTarget.name}» با موفقیت حذف شد.`, timeout: 4000 });
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف دسته‌بندی ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="دسته‌بندی‌ها" description="دسته‌های اصلی، زیردسته‌ها، ترتیب نمایش و تصویر شاخص را مدیریت کنید." />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام دسته‌بندی" required maxLength={categoryFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً موبایل" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpInput name="slug" label="نشانی انگلیسی (Slug)" required dir="ltr" maxLength={categoryFieldLimits.slug} value={slug} error={errors.slug} hint="فقط حروف کوچک انگلیسی، رقم و خط تیره" placeholder="mobile-phones" onChange={(event) => { setSlug(event.target.value); clearError("slug"); }} />
                <BpTextarea name="description" label="توضیحات" rows={3} maxLength={categoryFieldLimits.description} value={description} error={errors.description} placeholder="توضیح کوتاه این دسته‌بندی" onChange={(event) => { setDescription(event.target.value); clearError("description"); }} />
                <BpCombobox
                  name="parentId"
                  label="دسته والد"
                  value={parentId}
                  error={errors.parentId}
                  placeholder="بدون والد (دسته اصلی)"
                  emptyLabel="دسته‌ای با این نام پیدا نشد"
                  onChange={(next) => { setParentId(next); clearError("parentId"); }}
                  options={parentOptions}
                />

                <div>
                  <span className="bp-muted mb-1.5 block text-[12px] font-bold">تصویر شاخص</span>
                  <div className="flex items-center gap-3">
                    {image
                      ? <span className="relative h-12 w-12 shrink-0 overflow-hidden border border-[var(--bp-divider)] bg-white"><Image src={image.url} alt={image.title} fill sizes="48px" className="object-cover" /></span>
                      : <span className="grid h-12 w-12 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-muted)]"><FolderTree size={18} /></span>}
                    <BpButton type="button" size="sm" className="gap-2" onClick={() => setPickerOpen(true)}><Images size={13} />{image ? "تغییر" : "انتخاب از گالری"}</BpButton>
                    {image && <BpButton type="button" isIconOnly size="sm" variant="ghost" aria-label="حذف تصویر" className="text-[var(--bp-danger)]" onClick={() => setImage(null)}><Trash2 size={13} /></BpButton>}
                  </div>
                </div>

                <BpNumberInput name="sortOrder" label="ترتیب نمایش" value={sortOrder} error={errors.sortOrder} hint="عدد کوچک‌تر، زودتر نمایش داده می‌شود." onValueChange={(next) => { setSortOrder(next); clearError("sortOrder"); }} />
                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
                <BpSwitch isSelected={featured} onChange={setFeatured}>نمایش در صفحه اصلی</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیره تغییرات" : "افزودن دسته‌بندی"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel>
          {items.length ? (
            <>
              <div className="md:hidden">
                {items.map((category) => {
                  const locked = category._count.products > 0 || category._count.children > 0;
                  return (
                    <article key={category.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <CategoryThumb image={category.image} name={category.name} />
                        <div className="min-w-0 flex-1">
                          <strong className="flex items-center gap-1.5 truncate text-sm">{category.name}{category.featured && <Star size={13} className="shrink-0 fill-[var(--bp-accent)] text-[var(--bp-accent)]" />}</strong>
                          <span className="bp-muted block truncate text-xs">{category.parentName ?? "دسته اصلی"}</span>
                        </div>
                        <AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="bp-muted">{category._count.products.toLocaleString("fa-IR")} محصول · {category._count.children.toLocaleString("fa-IR")} زیردسته</span>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/categories/${category.id}/attributes`} aria-label={`ویژگی‌های دسته‌بندی ${category.name}`} className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><SlidersHorizontal size={13} /></Link>
                          <BpButton isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${category.name}`} onClick={() => startEdit(category)}><Pencil size={14} /></BpButton>
                          <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${category.name}`} disabled={locked} onClick={() => { setDeleteError(""); setDeleteTarget(category); }}><Trash2 size={14} /></BpButton>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <AdminBulkEditor entity="categories" entityLabel="دسته‌بندی" ids={items.map((category) => category.id)} actions={[{ value: "featured:on", label: "نمایش در صفحه اصلی" }, { value: "featured:off", label: "حذف از صفحه اصلی" }, { value: "active:on", label: "فعال‌کردن دسته‌بندی‌ها" }, { value: "active:off", label: "غیرفعال‌کردن دسته‌بندی‌ها" }]}>
                <BpTable ariaLabel="فهرست دسته‌بندی‌ها" minWidth={760}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh>دسته‌بندی</BpTh>
                      <BpTh>والد</BpTh>
                      <BpTh>محصولات</BpTh>
                      <BpTh>زیردسته‌ها</BpTh>
                      <BpTh>ترتیب</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((category) => {
                      const locked = category._count.products > 0 || category._count.children > 0;
                      return (
                        <tr key={category.id}>
                          <BpTd className="w-10 text-center"><AdminBulkCheckbox id={category.id} label={`انتخاب دسته‌بندی ${category.name}`} /></BpTd>
                          <BpTd className="max-w-[220px]">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <CategoryThumb image={category.image} name={category.name} />
                              <div className="min-w-0">
                                <span className="flex items-center gap-1.5 truncate font-bold" title={category.name}>{category.name}{category.featured && <Star size={13} className="shrink-0 fill-[var(--bp-accent)] text-[var(--bp-accent)]" />}</span>
                                <span dir="ltr" className="bp-muted block truncate text-right font-mono text-[11px]">{category.slug}</span>
                              </div>
                            </div>
                          </BpTd>
                          <BpTd className="bp-muted max-w-[140px] truncate" title={category.parentName ?? "دسته اصلی"}>{category.parentName ?? "دسته اصلی"}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category._count.products.toLocaleString("fa-IR")}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category._count.children.toLocaleString("fa-IR")}</BpTd>
                          <BpTd className="text-[var(--bp-text)]">{category.sortOrder.toLocaleString("fa-IR")}</BpTd>
                          <BpTd><AdminStatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge></BpTd>
                          <BpTd>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/admin/categories/${category.id}/attributes`} aria-label={`ویژگی‌های دسته‌بندی ${category.name}`} title="ویژگی‌های دسته‌بندی" className="bp-btn bp-btn-secondary bp-btn-icon bp-btn-sm"><SlidersHorizontal size={14} /></Link>
                              <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش دسته‌بندی" aria-label={`ویرایش ${category.name}`} onClick={() => startEdit(category)}><Pencil size={14} /></BpButton>
                              <BpButton isIconOnly size="sm" variant="ghost" title={locked ? "دسته دارای محصول یا زیردسته قابل حذف نیست" : "حذف دسته‌بندی"} className="text-[var(--bp-danger)]" aria-label={`حذف ${category.name}`} disabled={locked} onClick={() => { setDeleteError(""); setDeleteTarget(category); }}><Trash2 size={14} /></BpButton>
                            </div>
                          </BpTd>
                        </tr>
                      );
                    })}
                  </tbody>
                </BpTable>
              </AdminBulkEditor>
            </>
          ) : <AdminEmptyState title="دسته‌بندی‌ای ثبت نشده" description="اولین دسته فروشگاه را از فرم کنار جدول ثبت کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این دسته‌بندی، اطلاعات آن برای همیشه پاک می‌شود. دسته‌هایی که محصول یا زیردسته دارند قابل حذف نیستند."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />

      <MediaPickerDialog open={pickerOpen} scope="CATEGORY" allowedTypes={["IMAGE"]} selected={image ? [image] : []} onClose={() => setPickerOpen(false)} onConfirm={(items) => setImage(items[0] ?? null)} />
    </div>
  );
}
