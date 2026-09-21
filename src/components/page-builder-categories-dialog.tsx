"use client";

import { useState } from "react";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { categoriesSectionSettingsSchema, categoriesSortLabels, categoriesSortValues, type CategoriesSectionSettings, type CategoriesSort } from "@/modules/page-builder/section-settings";
import { pageSectionLimits } from "@/modules/settings/settings-limits";

type FieldErrors = Partial<Record<"title" | "limit" | "sort", string>>;

const fieldIds = { title: "builder-categories-title", limit: "builder-categories-limit", sort: "builder-categories-sort" } as const;
const sortOptions = categoriesSortValues.map((value) => ({ value, label: categoriesSortLabels[value] }));

/**
 * The page builder's edit form of the homepage category strip: its title, how many categories it lists and in which
 * order. It saves on its own through the page-sections API and the page is refreshed afterwards.
 */
export function PageBuilderCategoriesDialog({ sectionLabel, initial, onSaved, onClose }: { sectionLabel: string; initial: CategoriesSectionSettings; onSaved: () => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [limit, setLimit] = useState(String(initial.limit));
  const [sort, setSort] = useState<CategoriesSort>(initial.sort);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function showFieldErrors(next: FieldErrors) {
    setErrors(next);
    const first = (["title", "limit", "sort"] as const).find((field) => next[field]);
    if (first) document.getElementById(fieldIds[first])?.focus();
  }

  async function submit() {
    setFormError("");
    const parsed = categoriesSectionSettingsSchema.safeParse({ title, limit: limit === "" ? Number.NaN : Number(limit), sort });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      showFieldErrors({ title: fieldErrors.title?.[0], limit: fieldErrors.limit?.[0], sort: fieldErrors.sort?.[0] });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/page-sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId: "CATEGORIES", settings: parsed.data }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const issues = result?.issues as Record<string, string[] | undefined> | undefined;
        if (issues?.title || issues?.limit || issues?.sort) showFieldErrors({ title: issues.title?.[0], limit: issues.limit?.[0], sort: issues.sort?.[0] });
        throw new Error(result?.message ?? "ذخیره تنظیمات بخش انجام نشد.");
      }
      toast.success("تنظیمات بخش ذخیره شد");
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "ذخیره تنظیمات بخش انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={`ویرایش ${sectionLabel}`} dir="rtl" className="mx-4 max-w-[520px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">ویرایش {sectionLabel}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="grid gap-1 p-5">
            <TextField id={fieldIds.title} label="عنوان بخش" required value={title} maxLength={pageSectionLimits.categoriesTitle} error={errors.title} disabled={saving} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: undefined })); }} />
            <div className="grid gap-x-3 sm:grid-cols-2">
              <TextField id={fieldIds.limit} label="تعداد نمایش" required inputMode="numeric" dir="ltr" value={limit} maxLength={String(pageSectionLimits.categoriesMax).length} hint={`حداکثر ${pageSectionLimits.categoriesMax.toLocaleString("fa-IR")} دسته`} error={errors.limit} disabled={saving} onChange={(event) => { setLimit(normalizeNumericValue(event.target.value, false)); setErrors((current) => ({ ...current, limit: undefined })); }} />
              <div>
                <span className="field-label">ترتیب نمایش</span>
                <HeroSelectField name="builder-categories-sort" ariaLabel="ترتیب نمایش" className="mt-2" includeEmptyOption={false} value={sort} options={sortOptions} disabled={saving} error={errors.sort} reserveErrorSpace onValueChange={(value) => { setSort(value as CategoriesSort); setErrors((current) => ({ ...current, sort: undefined })); }} />
              </div>
            </div>
            {formError && <InlineAlert status="danger" compact className="mt-2">{formError}</InlineAlert>}
          </Modal.Body>
          <Modal.Footer className="justify-start gap-3 border-t border-[var(--border)] p-5">
            <Button type="button" variant="primary" isPending={saving} onPress={() => void submit()} className="min-h-11 min-w-24 rounded-xl px-6 text-sm font-bold" style={brandPrimaryButtonStyle}>
              {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}تأیید</>}
            </Button>
            <Button type="button" variant="outline" isDisabled={saving} onPress={onClose} className="min-h-11 rounded-xl px-6 text-sm font-bold">انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
