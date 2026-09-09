"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ArrowRight, ImageOff, Trash2, Upload } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { RichTextEditor } from "@/components/rich-text-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";
import { articleFieldLimits, articleSchema, articleStatuses } from "@/modules/articles/schemas";
import { articleStatusLabels } from "@/modules/admin/labels";
import { BpButton } from "./ui/button";
import { BpKicker } from "./ui/card";
import { BpCheckbox } from "./ui/checkbox";
import { BpDateTimeField } from "./ui/date-time-field";
import { BpInput, BpTextarea } from "./ui/input";
import { BpSelect } from "./ui/select";

export type ArticleFormData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  authorName: string;
  status: (typeof articleStatuses)[number];
  publishedAt: string | null;
  categoryId: string | null;
  metaTitle: string;
  metaDescription: string;
  noindex: boolean;
  cover: MediaChoice | null;
};

type Props = {
  article?: ArticleFormData;
  categories: Array<{ id: string; name: string }>;
  defaultAuthorName: string;
};

type FieldErrors = Partial<Record<string, string>>;

export function BlueprintArticleForm({ article, categories, defaultAuthorName }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [authorName, setAuthorName] = useState(article?.authorName ?? defaultAuthorName);
  const [status, setStatus] = useState<string>(article?.status ?? "DRAFT");
  const [publishedAt, setPublishedAt] = useState<string | null>(article?.publishedAt ?? null);
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [metaTitle, setMetaTitle] = useState(article?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(article?.metaDescription ?? "");
  const [noindex, setNoindex] = useState(article?.noindex ?? false);
  const [cover, setCover] = useState<MediaChoice | null>(article?.cover ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useUnsavedChangesWarning(dirty && !saving);
  const touch = () => setDirty(true);
  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  function buildBody() {
    return {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content,
      coverMediaId: cover?.id ?? null,
      authorName: authorName.trim(),
      status,
      publishedAt: publishedAt ?? null,
      categoryId: categoryId || null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      noindex,
    };
  }

  async function submit() {
    const body = buildBody();
    const validation = articleSchema.safeParse(body);
    const found: FieldErrors = {};
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!found[field]) found[field] = issue.message;
      }
    }
    if (!body.content.replace(/<[^>]*>/g, "").trim() && !/<(img|table|hr)\b/i.test(body.content)) {
      found.content = "متن مقاله را وارد کنید.";
    }
    if (Object.keys(found).length) {
      setErrors(found);
      toast.danger("فرم کامل نیست", { description: "خطاهای مشخص‌شده را برطرف کنید." });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await requestJson(article ? `/api/admin/articles/${article.id}` : "/api/admin/articles", {
        method: article ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, { fallbackMessage: "ذخیرهٔ مقاله انجام نشد." });
      setDirty(false);
      toast.success(article ? "مقاله به‌روزرسانی شد" : "مقاله ثبت شد");
      router.push("/admin/articles");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیرهٔ مقاله انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/articles" className="bp-muted inline-flex items-center gap-1.5 text-[12px] font-bold">
          <ArrowRight size={15} />بازگشت به مقالات
        </Link>
        <BpButton variant="primary" isPending={saving} onClick={() => void submit()}>{article ? "ذخیرهٔ تغییرات" : "ثبت مقاله"}</BpButton>
      </div>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>محتوای مقاله</BpKicker>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="عنوان مقاله" required maxLength={articleFieldLimits.title} value={title} error={errors.title} onChange={(event) => { setTitle(event.target.value); clearError("title"); touch(); }} />
            <BpInput label="نشانی انگلیسی (Slug)" required dir="ltr" maxLength={articleFieldLimits.slug} value={slug} error={errors.slug} hint="فقط حروف کوچک انگلیسی، رقم و خط تیره" placeholder="gold-buying-guide" onChange={(event) => { setSlug(event.target.value); clearError("slug"); touch(); }} />
          </div>
          <BpTextarea label="خلاصهٔ مقاله" required rows={2} maxLength={articleFieldLimits.excerpt} value={excerpt} error={errors.excerpt} hint="در فهرست مقالات و توضیحات متا استفاده می‌شود." onChange={(event) => { setExcerpt(event.target.value); clearError("excerpt"); touch(); }} />
          <div>
            <span className="bp-muted mb-1.5 block text-[12px] font-bold">متن مقاله</span>
            <RichTextEditor value={content} onChange={(html) => { setContent(html); clearError("content"); touch(); }} />
            {errors.content && <p role="alert" className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-danger)]">{errors.content}</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-2 lg:grid-cols-2">
        <section className="bp-frame relative p-[16px]">
          <BpKicker>تصویر کاور و نویسنده</BpKicker>
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap items-center gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--bp-card)] text-[var(--bp-muted)]">
                {cover ? <Image src={cover.url} alt={cover.title} fill sizes="48px" className="object-cover" /> : <ImageOff size={16} />}
              </span>
              <div className="min-w-0 flex-1"><strong className="block text-[13px]">تصویر کاور</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{cover?.title ?? "برای فهرست، شبکه‌های اجتماعی و اسکیمای مقاله"}</span></div>
              <BpButton type="button" size="sm" className="gap-1.5" onClick={() => setPickerOpen(true)}><Upload size={13} />{cover ? "تغییر" : "انتخاب"}</BpButton>
              {cover && <BpButton type="button" isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label="حذف کاور" onClick={() => { setCover(null); touch(); }}><Trash2 size={13} /></BpButton>}
            </div>
            <BpInput label="نام نویسنده" required maxLength={articleFieldLimits.authorName} value={authorName} error={errors.authorName} onChange={(event) => { setAuthorName(event.target.value); clearError("authorName"); touch(); }} />
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>انتشار و دسته‌بندی</BpKicker>
          <div className="mt-3 grid gap-3">
            <BpSelect label="وضعیت" value={status} options={articleStatuses.map((value) => ({ value, label: articleStatusLabels[value] }))} onChange={(event) => { setStatus(event.target.value); touch(); }} />
            <BpDateTimeField label="تاریخ انتشار" value={publishedAt} onChange={(value) => { setPublishedAt(value); touch(); }} hint="خالی بگذارید تا هنگام انتشار به‌صورت خودکار ثبت شود." />
            <BpSelect label="دسته" value={categoryId} placeholder="بدون دسته" options={categories.map((category) => ({ value: category.id, label: category.name }))} onChange={(event) => { setCategoryId(event.target.value); touch(); }} />
          </div>
        </section>
      </div>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>تنظیمات SEO</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">قواعد ریدایرکت و کنونیکال سراسری برای نشانی این مقاله از بخش «SEO حرفه‌ای» مدیریت می‌شود.</p>
        <div className="mt-3 grid gap-3">
          <BpInput label="عنوان متا" maxLength={articleFieldLimits.metaTitle} value={metaTitle} error={errors.metaTitle} hint="خالی بماند از عنوان مقاله استفاده می‌شود." onChange={(event) => { setMetaTitle(event.target.value); clearError("metaTitle"); touch(); }} />
          <BpTextarea label="توضیحات متا" rows={2} maxLength={articleFieldLimits.metaDescription} value={metaDescription} error={errors.metaDescription} hint="خالی بماند از خلاصهٔ مقاله استفاده می‌شود." onChange={(event) => { setMetaDescription(event.target.value); clearError("metaDescription"); touch(); }} />
          <BpCheckbox isSelected={noindex} onChange={() => { setNoindex((value) => !value); touch(); }} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
            <span><strong className="block text-[13px] font-bold">حذف از ایندکس (noindex)</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">مقاله با هدر noindex منتشر می‌شود و در سایت‌مپ نمی‌آید.</span></span>
          </BpCheckbox>
        </div>
      </section>

      <div className="flex justify-end">
        <BpButton variant="primary" isPending={saving} onClick={() => void submit()}>{article ? "ذخیرهٔ تغییرات" : "ثبت مقاله"}</BpButton>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        scope="ARTICLE"
        allowedTypes={["IMAGE"]}
        selected={cover ? [cover] : []}
        onClose={() => setPickerOpen(false)}
        onConfirm={(items) => { setCover(items[0] ?? null); touch(); }}
      />
    </div>
  );
}
