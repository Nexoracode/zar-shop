"use client";

import { toast } from "@heroui/react";
import { ContentFormDialog, ContentSaveError } from "@/components/content-form-dialog";
import { sectionContentFields, sectionSettingsSchemas, type PageSectionSettings, type SectionSettingsId } from "@/modules/page-builder/section-settings";

/**
 * The edit form of a section that has fixed content settings (the category strip…): the fields come from
 * `sectionContentFields`, it saves through the page-sections API.
 */
export function SectionContentDialog({ sectionId, sectionLabel, initial, onSaved, onClose }: { sectionId: SectionSettingsId; sectionLabel: string; initial: PageSectionSettings[SectionSettingsId]; onSaved: () => void; onClose: () => void }) {
  const fields = sectionContentFields[sectionId];

  async function save(settings: unknown) {
    const response = await fetch("/api/admin/settings/page-sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId, settings }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new ContentSaveError(result?.message ?? "ذخیره تنظیمات بخش انجام نشد.", result?.issues);
    toast.success("تنظیمات بخش ذخیره شد");
  }

  return (
    <ContentFormDialog
      title={`ویرایش ${sectionLabel}`}
      ariaLabel={`ویرایش ${sectionLabel}`}
      idPrefix={`builder-content-${sectionId}`}
      fields={fields}
      initial={Object.fromEntries(fields.map((field) => [field.name, String((initial as Record<string, unknown>)[field.name] ?? "")]))}
      schema={sectionSettingsSchemas[sectionId]}
      save={save}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
}
