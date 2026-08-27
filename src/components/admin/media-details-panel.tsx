"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "@heroui/react";
import { FileText, Film, TriangleAlert } from "lucide-react";
import { TextAreaField, TextField } from "@/components/form-field";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpInput, BpTextarea } from "@/components/admin/blueprint/ui/input";
import { AdminSaveButton } from "@/components/admin-save-button";
import { useAdminTemplate } from "@/components/admin/template-context";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { formatDate } from "@/lib/format";
import { mediaFieldLimits } from "@/modules/media/limits";

export type MediaDetails = {
  id: string;
  title: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  mimeType?: string;
  alt?: string | null;
  caption?: string | null;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number;
  createdAt?: string | Date;
  usageCount?: number;
};

type Fields = { title: string; alt: string; caption: string; description: string };

function formatSize(bytes?: number) {
  if (!bytes) return "—";
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${megabytes.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت`
    : `${(bytes / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} کیلوبایت`;
}

/**
 * The attachment editor, WordPress-style: a preview, the read-only facts about the file, and the
 * text that actually matters for SEO. Shared by the media page and the picker dialog, and by both
 * admin templates — only the field components differ.
 */
export function MediaDetailsPanel({ media, onSaved, className = "" }: { media: MediaDetails; onSaved: (updated: MediaDetails) => void; className?: string }) {
  const template = useAdminTemplate();
  /*
   * State is seeded from the asset once. Callers mount this with `key={media.id}`, so choosing a
   * different asset remounts the panel rather than syncing props into state through an effect.
   */
  const [fields, setFields] = useState<Fields>({
    title: media.title ?? "",
    alt: media.alt ?? "",
    caption: media.caption ?? "",
    description: media.description ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [saving, setSaving] = useState(false);

  function set(field: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function validate() {
    const found: Partial<Record<keyof Fields, string>> = {};
    if (fields.title.trim().length > 191) found.title = "عنوان نباید بیشتر از ۱۹۱ نویسه باشد.";
    if (fields.alt.trim().length > 191) found.alt = "متن جایگزین نباید بیشتر از ۱۹۱ نویسه باشد.";
    if (fields.caption.trim().length > 300) found.caption = "کپشن نباید بیشتر از ۳۰۰ نویسه باشد.";
    if (fields.description.trim().length > 5000) found.description = "توضیحات نباید بیشتر از ۵۰۰۰ نویسه باشد.";
    return found;
  }

  async function save() {
    const found = validate();
    if (Object.keys(found).length) { setErrors(found); return; }
    setSaving(true);
    try {
      const updated = await requestJson<MediaDetails>(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title.trim(),
          alt: fields.alt.trim(),
          caption: fields.caption.trim(),
          description: fields.description.trim(),
        }),
      }, { fallbackMessage: "ذخیره اطلاعات رسانه انجام نشد." });
      toast.success("اطلاعات رسانه ذخیره شد");
      onSaved(updated);
    } catch (reason) {
      toast.danger("ذخیره اطلاعات رسانه انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSaving(false);
    }
  }

  const blueprint = template === "BLUEPRINT";
  const missingAlt = !fields.alt.trim() && media.type === "IMAGE";
  const facts: Array<[string, string]> = [
    ["ابعاد", media.width && media.height ? `${media.width.toLocaleString("fa-IR")} × ${media.height.toLocaleString("fa-IR")}` : "ثبت نشده"],
    ["حجم", formatSize(media.sizeBytes)],
    ["نوع فایل", media.mimeType ?? "—"],
    ["تاریخ بارگذاری", media.createdAt ? formatDate(media.createdAt) : "—"],
    ["تعداد استفاده", (media.usageCount ?? 0).toLocaleString("fa-IR")],
  ];

  // A square preview at the panel's own width (as narrow as 300px) stood as tall as it was wide —
  // most of the card, crowding out the facts and fields under it. A fixed, modest height keeps it
  // a thumbnail regardless of how narrow the panel gets.
  const preview = (
    <div className={`relative h-44 w-full overflow-hidden ${blueprint ? "border border-[var(--bp-divider)] bg-[var(--bp-surface)]" : "rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]"}`}>
      {media.type === "IMAGE"
        ? <Image src={media.url} alt={fields.alt || media.title} fill unoptimized={media.mimeType === "image/gif"} sizes="320px" className="object-contain" />
        : media.type === "VIDEO"
          ? <video src={media.url} controls className="h-full w-full bg-black object-contain" />
          : <span className="grid h-full place-items-center text-[var(--muted)]"><span className="grid justify-items-center gap-2 text-xs"><FileText size={38} />فایل PDF</span></span>}
      {media.type === "VIDEO" && <span className="absolute left-2 top-2"><Film size={15} /></span>}
    </div>
  );

  const factList = (
    <dl className={`m-0 grid gap-1.5 ${blueprint ? "text-[12px]" : "text-xs"}`}>
      {facts.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <dt className={`shrink-0 ${blueprint ? "bp-muted" : "text-[var(--muted)]"}`}>{label}</dt>
          <dd className="m-0 min-w-0 truncate" dir={label === "نوع فایل" ? "ltr" : undefined}>{value}</dd>
        </div>
      ))}
    </dl>
  );

  const altHint = "چیزی که تصویر نشان می‌دهد را کوتاه توصیف کنید؛ همین متن برای موتور جستجو و صفحه‌خوان خوانده می‌شود.";

  return (
    // `min-w-0` keeps this panel itself from being forced past its own 300px column. `overflow-x-
    // hidden` handles a second, independent issue one level in: this element is also a grid
    // container for its own children, and its implicit column sizes to fit their content with no
    // ceiling of its own — `min-w-0` on a descendant does not add one. A long, unwrapped hint
    // (`.bp-field-message`'s `white-space: nowrap`) was reaching through every wrapper in between
    // and inflating that column past the card no matter how far down min-w-0 was chased.
    <aside className={`grid min-w-0 content-start gap-4 overflow-x-hidden ${className}`.trim()}>
      {preview}

      {missingAlt && (
        <p className={`m-0 flex items-start gap-2 text-[12px] ${blueprint ? "border border-[var(--bp-warning)] p-2.5 text-[var(--bp-warning)]" : "rounded-xl bg-amber-50 p-3 text-amber-800"}`}>
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          این تصویر متن جایگزین ندارد؛ برای سئو و دسترس‌پذیری آن را کامل کنید.
        </p>
      )}

      {factList}

      <div className="grid gap-2">
        {blueprint ? <>
          <BpInput label="عنوان" maxLength={mediaFieldLimits.title} value={fields.title} error={errors.title} onChange={(event) => set("title", event.target.value)} />
          <BpInput label="متن جایگزین (alt)" maxLength={mediaFieldLimits.alt} value={fields.alt} error={errors.alt} hint={altHint} onChange={(event) => set("alt", event.target.value)} />
          <BpInput label="کپشن" maxLength={mediaFieldLimits.caption} value={fields.caption} error={errors.caption} onChange={(event) => set("caption", event.target.value)} />
          <BpTextarea label="توضیحات" rows={4} maxLength={mediaFieldLimits.description} value={fields.description} error={errors.description} onChange={(event) => set("description", event.target.value)} />
          <BpButton variant="primary" fullWidth isPending={saving} onClick={() => void save()}>ذخیره اطلاعات</BpButton>
        </> : <>
          <TextField label="عنوان" maxLength={mediaFieldLimits.title} value={fields.title} error={errors.title} onChange={(event) => set("title", event.target.value)} />
          <TextField label="متن جایگزین (alt)" maxLength={mediaFieldLimits.alt} value={fields.alt} error={errors.alt} hint={altHint} onChange={(event) => set("alt", event.target.value)} />
          <TextField label="کپشن" maxLength={mediaFieldLimits.caption} value={fields.caption} error={errors.caption} onChange={(event) => set("caption", event.target.value)} />
          <TextAreaField label="توضیحات" rows={4} maxLength={mediaFieldLimits.description} value={fields.description} error={errors.description} onChange={(event) => set("description", event.target.value)} />
          {/* HeroUI buttons take `onPress`, and this one is not inside a form. */}
          <AdminSaveButton type="button" isSaving={saving} label="ذخیره اطلاعات" fullWidth onPress={() => void save()} />
        </>}
      </div>
    </aside>
  );
}
