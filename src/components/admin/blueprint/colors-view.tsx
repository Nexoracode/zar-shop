"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { colorFieldLimits, colorSchema } from "@/modules/colors/schemas";
import { BpButton, BpColorField, BpInput, BpNumberInput, BpSwitch, BpTable, BpTd, BpTh } from "./ui";

type ColorItem = { id: string; name: string; hex: string; isActive: boolean; sortOrder: number };
type FieldErrors = Record<string, string>;

const emptyForm = { name: "", hex: "#C9A56A", sortOrder: "0", isActive: true };

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bp-frame relative p-[18px]">
      <div className="min-w-0">
        <h3 className="m-0">{title}</h3>
        {description && <p className="bp-muted mb-0 mt-1 text-[12px] leading-6">{description}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ColorSwatchBox({ hex }: { hex: string }) {
  return <span aria-hidden className="bp-frame block h-7 w-7 shrink-0" style={{ background: hex }} />;
}

export function BlueprintColorsView({ colors }: { colors: ColorItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<ColorItem | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [hex, setHex] = useState(emptyForm.hex);
  const [sortOrder, setSortOrder] = useState(emptyForm.sortOrder);
  const [isActive, setIsActive] = useState<boolean>(emptyForm.isActive);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
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
    setSortOrder(emptyForm.sortOrder);
    setIsActive(emptyForm.isActive);
    setErrors({});
  }

  function startEdit(color: ColorItem) {
    setEditing(color);
    setName(color.name);
    setHex(color.hex);
    setSortOrder(String(color.sortOrder));
    setIsActive(color.isActive);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const validation = colorSchema.safeParse({ name, hex, sortOrder, isActive });
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
      await requestJson(editing ? `/api/colors/${editing.id}` : "/api/colors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
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
            <Panel title={editing ? `ویرایش «${editing.name}»` : "رنگ جدید"} description="نام، کد و ترتیب نمایش رنگ را تکمیل کنید.">
              <div className="grid gap-3">
                <BpInput name="name" label="نام رنگ" required maxLength={colorFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً رزگلد" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpColorField name="hex" label="کد رنگ" required maxLength={colorFieldLimits.hex} value={hex} error={errors.hex} onChange={(next) => { setHex(next); clearError("hex"); }} />
                <BpNumberInput name="sortOrder" label="ترتیب نمایش" value={sortOrder} error={errors.sortOrder} onValueChange={(next) => { setSortOrder(next); clearError("sortOrder"); }} />
                <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیره تغییرات" : "افزودن رنگ"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel title="فهرست رنگ‌ها">
          {colors.length ? (
            <>
              <div className="md:hidden">
                {colors.map((color) => (
                  <article key={color.id} className="flex flex-col gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <ColorSwatchBox hex={color.hex} />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{color.name}</strong>
                        <span dir="ltr" className="bp-muted block text-right font-mono text-xs">{color.hex}</span>
                      </div>
                      <AdminStatusBadge tone={color.isActive ? "success" : "neutral"}>{color.isActive ? "فعال" : "غیرفعال"}</AdminStatusBadge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bp-muted text-xs">ترتیب {color.sortOrder.toLocaleString("fa-IR")}</span>
                      <div className="me-auto flex gap-1">
                        <BpButton isIconOnly size="sm" variant="ghost" aria-label={`ویرایش ${color.name}`} onClick={() => startEdit(color)}><Pencil size={14} /></BpButton>
                        <BpButton isIconOnly size="sm" variant="ghost" className="text-[var(--bp-danger)]" aria-label={`حذف ${color.name}`} onClick={() => { setDeleteError(""); setDeleteTarget(color); }}><Trash2 size={14} /></BpButton>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <AdminBulkEditor entity="colors" entityLabel="رنگ" ids={colors.map((color) => color.id)} actions={[{ value: "active:on", label: "فعال‌کردن رنگ‌ها" }, { value: "active:off", label: "غیرفعال‌کردن رنگ‌ها" }]}>
                <BpTable ariaLabel="فهرست رنگ‌ها" minWidth={620}>
                  <thead>
                    <tr>
                      <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                      <BpTh className="w-10">رنگ</BpTh>
                      <BpTh>نام</BpTh>
                      <BpTh>کد</BpTh>
                      <BpTh>ترتیب</BpTh>
                      <BpTh>وضعیت</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((color) => (
                      <tr key={color.id}>
                        <BpTd className="w-10 text-center"><AdminBulkCheckbox id={color.id} label={`انتخاب رنگ ${color.name}`} /></BpTd>
                        <BpTd><ColorSwatchBox hex={color.hex} /></BpTd>
                        <BpTd className="max-w-[180px] truncate font-bold" title={color.name}>{color.name}</BpTd>
                        <BpTd className="bp-muted font-mono"><span dir="ltr">{color.hex}</span></BpTd>
                        <BpTd className="bp-muted">{color.sortOrder.toLocaleString("fa-IR")}</BpTd>
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
