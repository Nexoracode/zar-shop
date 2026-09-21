"use client";

import { ContentFormDialog } from "@/components/content-form-dialog";
import { sectionContentFields, sectionSettingsSchemas, type PageSectionSettings, type SectionSettingsId } from "@/modules/page-builder/section-settings";

/**
 * The edit form of a section that has fixed content settings (the category strip…): the fields come from
 * `sectionContentFields`. It only validates: the entered settings go into the page builder's draft (`onSaved`), nothing
 * is sent to the server from here.
 */
export function SectionContentDialog({ sectionId, sectionLabel, initial, onSaved, onClose }: { sectionId: SectionSettingsId; sectionLabel: string; initial: PageSectionSettings[SectionSettingsId]; onSaved: (settings: PageSectionSettings[SectionSettingsId]) => void; onClose: () => void }) {
  const fields = sectionContentFields[sectionId];

  return (
    <ContentFormDialog
      title={`ویرایش ${sectionLabel}`}
      ariaLabel={`ویرایش ${sectionLabel}`}
      idPrefix={`builder-content-${sectionId}`}
      fields={fields}
      initial={Object.fromEntries(fields.map((field) => [field.name, String((initial as Record<string, unknown>)[field.name] ?? "")]))}
      schema={sectionSettingsSchemas[sectionId]}
      save={async () => undefined}
      onSaved={(settings) => onSaved(settings as PageSectionSettings[SectionSettingsId])}
      onClose={onClose}
    />
  );
}
