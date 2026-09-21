"use client";

import { useState } from "react";
import type { ZodType } from "zod";
import { Button, I18nProvider, Modal, Spinner } from "@heroui/react";
import { X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { RichTextField } from "@/components/rich-text-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import type { ContentField } from "@/modules/page-builder/section-settings";

/** Thrown by a form's `save` when the server refused: its message, and the per-field messages it sent, if any. */
export class ContentSaveError extends Error {
  constructor(message: string, readonly issues: Record<string, string[] | undefined> = {}) {
    super(message);
  }
}

type Values = Record<string, string>;

/** The values as the schema expects them: number fields as numbers (an empty one is not a number), the rest as typed. */
function defaultInput(fields: ContentField[], values: Values) {
  return Object.fromEntries(fields.map((field) => [field.name, field.kind === "number" ? (values[field.name] === "" ? Number.NaN : Number(values[field.name])) : values[field.name]]));
}

/**
 * The page builder's form for a section's content settings (title, how many items, which source…). The fields are
 * described by `ContentField`s and validated with the caller's schema — the very one the server uses, so the limits
 * live in one place — before `save` is called. It saves on its own; the page is refreshed by the caller afterwards.
 */
export function ContentFormDialog({ title, ariaLabel, idPrefix, fields, initial, schema, toInput, save, onSaved, onClose }: {
  title: string;
  ariaLabel: string;
  /** Makes the field element ids unique per form, so an error can focus its field. */
  idPrefix: string;
  fields: ContentField[];
  initial: Values;
  schema: ZodType;
  /** Turns the form values into what `schema` expects; defaults to numbers-as-numbers, the rest as typed. */
  toInput?: (values: Values) => unknown;
  save: (data: unknown) => Promise<void>;
  /** Called after a successful save with the validated data that was saved. */
  onSaved: (data: unknown) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const visible = fields.filter((field) => !field.visibleWhen || field.visibleWhen(values));
  const idOf = (name: string) => `${idPrefix}-${name}`;

  function showFieldErrors(next: Record<string, string | undefined>) {
    setErrors(next);
    const first = visible.find((field) => next[field.name]);
    if (first) document.getElementById(idOf(first.name))?.focus();
  }

  function change(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit() {
    setFormError("");
    const parsed = schema.safeParse(toInput ? toInput(values) : defaultInput(visible, values));
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      showFieldErrors(Object.fromEntries(fields.map((field) => [field.name, fieldErrors[field.name]?.[0]])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await save(parsed.data);
      onSaved(parsed.data);
    } catch (reason) {
      if (reason instanceof ContentSaveError && fields.some((field) => reason.issues[field.name])) showFieldErrors(Object.fromEntries(fields.map((field) => [field.name, reason.issues[field.name]?.[0]])));
      setFormError(reason instanceof Error ? reason.message : "ذخیره تنظیمات بخش انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: ContentField) {
    const id = idOf(field.name);
    if (field.kind === "richtext") return <RichTextField key={field.name} id={id} label={field.label} value={values[field.name]} maxLength={field.maxLength} hint={field.hint} error={errors[field.name]} disabled={saving} onChange={(html) => change(field.name, html)} />;
    if (field.kind === "text") return <TextField key={field.name} id={id} label={field.label} required={!field.optional} value={values[field.name]} maxLength={field.maxLength} error={errors[field.name]} disabled={saving} onChange={(event) => change(field.name, event.target.value)} />;
    if (field.kind === "number") return <TextField key={field.name} id={id} label={field.label} required inputMode="numeric" dir="ltr" value={values[field.name]} maxLength={String(field.max).length} hint={field.hint} error={errors[field.name]} disabled={saving} onChange={(event) => change(field.name, normalizeNumericValue(event.target.value, false))} />;
    return (
      <div key={field.name}>
        <span className="field-label">{field.label}</span>
        <HeroSelectField name={id} ariaLabel={field.label} className="mt-2" placeholder={field.placeholder} includeEmptyOption={Boolean(field.placeholder)} searchable={field.searchable} value={values[field.name]} options={field.options} disabled={saving} error={errors[field.name]} reserveErrorSpace onValueChange={(value) => change(field.name, value)} />
      </div>
    );
  }

  const textFields = visible.filter((field) => field.kind === "text" || field.kind === "richtext");
  const rowFields = visible.filter((field) => field.kind !== "text" && field.kind !== "richtext");

  return (
    // react-aria places a select's list by the locale's direction, not the page's `dir`: without a Persian locale it opens
    // from the left edge of the field. The provider sits outside the modal so the portaled list inherits it.
    <I18nProvider locale="fa-IR">
      <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label={ariaLabel} dir="rtl" className="mx-4 max-w-[520px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="text-base font-bold">{title}</Modal.Heading>
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
