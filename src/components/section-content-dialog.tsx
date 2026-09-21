"use client";

import { useState } from "react";
import { Button, I18nProvider, Modal, Spinner, toast } from "@heroui/react";
import { X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { sectionContentFields, sectionSettingsSchemas, type ContentField, type PageSectionSettings, type SectionSettingsId } from "@/modules/page-builder/section-settings";

const fieldId = (sectionId: string, name: string) => `builder-content-${sectionId}-${name}`;

function toFormValues(sectionId: SectionSettingsId, settings: PageSectionSettings[SectionSettingsId]) {
  return Object.fromEntries(sectionContentFields[sectionId].map((field) => [field.name, String((settings as Record<string, unknown>)[field.name] ?? "")]));
}

/** What the section's schema validates: number fields as numbers (empty is not a number), the rest as typed. */
function toSchemaInput(fields: ContentField[], values: Record<string, string>) {
  return Object.fromEntries(fields.map((field) => [field.name, field.kind === "number" ? (values[field.name] === "" ? Number.NaN : Number(values[field.name])) : values[field.name]]));
}

/**
 * The page builder's edit form for a section's content settings (title, how many items, in which order…). The
 * fields come from `sectionContentFields` and are validated with the section's own schema — the one the server
 * uses — so the limits live in one place. It saves on its own through the page-sections API and the page is
 * refreshed afterwards.
 */
export function SectionContentDialog({ sectionId, sectionLabel, initial, onSaved, onClose }: { sectionId: SectionSettingsId; sectionLabel: string; initial: PageSectionSettings[SectionSettingsId]; onSaved: () => void; onClose: () => void }) {
  const fields = sectionContentFields[sectionId];
  const [values, setValues] = useState(() => toFormValues(sectionId, initial));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function showFieldErrors(next: Record<string, string | undefined>) {
    setErrors(next);
    const first = fields.find((field) => next[field.name]);
    if (first) document.getElementById(fieldId(sectionId, first.name))?.focus();
  }

  function change(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit() {
    setFormError("");
    const parsed = sectionSettingsSchemas[sectionId].safeParse(toSchemaInput(fields, values));
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      showFieldErrors(Object.fromEntries(fields.map((field) => [field.name, fieldErrors[field.name]?.[0]])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/page-sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId, settings: parsed.data }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const issues = (result?.issues ?? {}) as Record<string, string[] | undefined>;
        if (fields.some((field) => issues[field.name])) showFieldErrors(Object.fromEntries(fields.map((field) => [field.name, issues[field.name]?.[0]])));
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

  const textFields = fields.filter((field) => field.kind === "text");
  const rowFields = fields.filter((field) => field.kind !== "text");

  function renderField(field: ContentField) {
    const id = fieldId(sectionId, field.name);
    if (field.kind === "text") return <TextField key={field.name} id={id} label={field.label} required value={values[field.name]} maxLength={field.maxLength} error={errors[field.name]} disabled={saving} onChange={(event) => change(field.name, event.target.value)} />;
    if (field.kind === "number") return <TextField key={field.name} id={id} label={field.label} required inputMode="numeric" dir="ltr" value={values[field.name]} maxLength={String(field.max).length} hint={field.hint} error={errors[field.name]} disabled={saving} onChange={(event) => change(field.name, normalizeNumericValue(event.target.value, false))} />;
    return (
      <div key={field.name}>
        <span className="field-label">{field.label}</span>
        <HeroSelectField name={id} ariaLabel={field.label} className="mt-2" includeEmptyOption={false} value={values[field.name]} options={field.options} disabled={saving} error={errors[field.name]} reserveErrorSpace onValueChange={(value) => change(field.name, value)} />
      </div>
    );
  }

  return (
    // react-aria places a select's list by the locale's direction, not the page's `dir`: without a Persian locale it opens
    // from the left edge of the field. The provider sits outside the modal so the portaled list inherits it.
    <I18nProvider locale="fa-IR">
      <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label={`ویرایش ${sectionLabel}`} dir="rtl" className="mx-4 max-w-[520px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="text-base font-bold">ویرایش {sectionLabel}</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="grid gap-1 p-5">
              {textFields.map(renderField)}
              {rowFields.length > 0 && <div className="grid gap-x-3 sm:grid-cols-2">{rowFields.map(renderField)}</div>}
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
    </I18nProvider>
  );
}
