"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Images, SquarePen, Trash2, UserRound } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { normalizeSearchText } from "@/lib/text-search";
import { authorFieldLimits, authorSchema } from "@/modules/authors/schemas";
import { BpButton, BpInput, BpListFilters, BpTable, BpTd, BpTextarea, BpTh } from "./ui";

export type AuthorRow = {
  id: string;
  name: string;
  bio: string | null;
  avatar: { id: string; url: string; alt: string | null } | null;
  _count: { articles: number };
};

type FieldErrors = Record<string, string>;

const emptyForm = { name: "", bio: "" };

function Panel({ children }: { children: ReactNode }) {
  return <section className="bp-frame relative p-[18px]">{children}</section>;
}

function AuthorThumb({ avatar, name }: { avatar: AuthorRow["avatar"]; name: string }) {
  return <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--bp-divider)] bg-white">{avatar ? <Image src={avatar.url} alt={avatar.alt ?? name} fill sizes="36px" className="object-cover" /> : <UserRound size={15} className="text-[var(--bp-muted)]" />}</span>;
}

export function BlueprintAuthorsView({ authors }: { authors: AuthorRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AuthorRow | null>(null);
  const [name, setName] = useState(emptyForm.name);
  const [bio, setBio] = useState(emptyForm.bio);
  const [avatar, setAvatar] = useState<MediaChoice | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthorRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
  }

  function resetForm() {
    setEditing(null);
    setName(emptyForm.name);
    setBio(emptyForm.bio);
    setAvatar(null);
    setErrors({});
  }

  function startEdit(author: AuthorRow) {
    setEditing(author);
    setName(author.name);
    setBio(author.bio ?? "");
    setAvatar(author.avatar ? { id: author.avatar.id, title: author.name, url: author.avatar.url, alt: author.avatar.alt, type: "IMAGE" } : null);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const body = { name, bio: bio.trim() || null, avatarMediaId: avatar?.id ?? null };
    const validation = authorSchema.safeParse(body);
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
      await requestJson(editing ? `/api/admin/authors/${editing.id}` : "/api/admin/authors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیرهٔ نویسنده انجام نشد." });
      toast.success(editing ? "تغییرات نویسنده ذخیره شد" : "نویسندهٔ جدید ثبت شد");
      resetForm();
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیرهٔ نویسنده انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await requestJson(`/api/admin/authors/${deleteTarget.id}`, { method: "DELETE" }, { fallbackMessage: "حذف نویسنده ناموفق بود." });
      toast.success("نویسنده حذف شد", { description: `نویسندهٔ «${deleteTarget.name}» با موفقیت حذف شد.`, timeout: 4000 });
      if (editing?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      router.refresh();
    } catch (reason) {
      setDeleteError(requestErrorMessage(reason, "حذف نویسنده ناموفق بود."));
    } finally {
      setDeleteLoading(false);
    }
  }

  const normalizedQuery = normalizeSearchText(query);
  const visible = authors.filter((author) => !normalizedQuery || normalizeSearchText(author.name).includes(normalizedQuery));

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader flush title="نویسندگان" description="پروفایل نویسندگانی که در نوشتن مقالات وبلاگ مشارکت دارند را مدیریت کنید." />

      <div className="grid items-start gap-2 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <Panel>
              <div className="grid gap-3">
                <BpInput name="name" label="نام نویسنده" required maxLength={authorFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً مریم احمدی" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
                <BpTextarea name="bio" label="بیوگرافی" rows={3} maxLength={authorFieldLimits.bio} value={bio} error={errors.bio} hint="در کارت نویسنده کنار صفحهٔ مقاله نمایش داده می‌شود." onChange={(event) => { setBio(event.target.value); clearError("bio"); }} />

                <div>
                  <span className="bp-muted mb-1.5 block text-[12px] font-bold">آواتار</span>
                  <div className="flex items-center gap-3">
                    <AuthorThumb avatar={avatar ? { id: avatar.id, url: avatar.url, alt: avatar.alt ?? null } : null} name={name || "نویسنده"} />
                    <BpButton type="button" size="sm" className="gap-2" onClick={() => setPickerOpen(true)}><Images size={13} />{avatar ? "تغییر" : "انتخاب از گالری"}</BpButton>
                    {avatar && <BpButton type="button" isIconOnly size="sm" variant="ghost" aria-label="حذف آواتار" className="bp-btn-danger-icon" onClick={() => setAvatar(null)}><Trash2 size={13} /></BpButton>}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <BpButton type="submit" variant="primary" fullWidth isPending={loading}>{editing ? "ذخیرهٔ تغییرات" : "افزودن نویسنده"}</BpButton>
                {editing && <BpButton type="button" fullWidth disabled={loading} onClick={resetForm}>انصراف از ویرایش</BpButton>}
              </div>
            </Panel>
          </form>
        </aside>

        <Panel>
          {authors.length ? (
            <>
              <BpListFilters query={query} onQueryChange={setQuery} searchLabel="جستجوی نویسنده" searchPlaceholder="جستجو بر اساس نام نویسنده" filters={[]} />
              {visible.length ? (
                <BpTable ariaLabel="فهرست نویسندگان" minWidth={480}>
                  <thead>
                    <tr>
                      <BpTh className="w-10">آواتار</BpTh>
                      <BpTh>نام</BpTh>
                      <BpTh>مقالات</BpTh>
                      <BpTh className="text-center">عملیات</BpTh>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((author) => (
                      <tr key={author.id} className="border-b border-[var(--bp-row-line)] last:border-b-0">
                        <BpTd><AuthorThumb avatar={author.avatar} name={author.name} /></BpTd>
                        <BpTd className="max-w-[220px] truncate font-bold" title={author.name}>{author.name}</BpTd>
                        <BpTd className="text-[var(--bp-text)]">{author._count.articles.toLocaleString("fa-IR")}</BpTd>
                        <BpTd>
                          <div className="flex items-center justify-center gap-1">
                            <BpButton isIconOnly size="sm" variant="ghost" title="ویرایش نویسنده" aria-label={`ویرایش ${author.name}`} onClick={() => startEdit(author)}><SquarePen size={15} strokeWidth={1.5} /></BpButton>
                            <BpButton isIconOnly size="sm" variant="ghost" title={author._count.articles > 0 ? "نویسندهٔ دارای مقاله قابل حذف نیست" : "حذف نویسنده"} className="bp-btn-danger-icon" aria-label={`حذف ${author.name}`} disabled={author._count.articles > 0} onClick={() => { setDeleteError(""); setDeleteTarget(author); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                          </div>
                        </BpTd>
                      </tr>
                    ))}
                  </tbody>
                </BpTable>
              ) : <div className="p-6"><AdminEmptyState title="نویسنده‌ای پیدا نشد" description="هیچ نویسنده‌ای با جستجوی انتخابی مطابقت ندارد." /></div>}
            </>
          ) : <AdminEmptyState title="نویسنده‌ای ثبت نشده" description="اولین نویسندهٔ وبلاگ را از فرم کنار جدول ثبت کنید." />}
        </Panel>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.name}
        description="با حذف این نویسنده، دیگر برای انتخاب روی مقالات در دسترس نخواهد بود."
        error={deleteError}
        loading={deleteLoading}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={() => void confirmDelete()}
      />

      <MediaPickerDialog open={pickerOpen} scope="ARTICLE_AUTHOR" allowedTypes={["IMAGE"]} selected={avatar ? [avatar] : []} onClose={() => setPickerOpen(false)} onConfirm={(items) => setAvatar(items[0] ?? null)} />
    </div>
  );
}
