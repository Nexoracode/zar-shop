"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Eye, X } from "lucide-react";
import { CheckboxCard } from "@/components/checkbox-card";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import type { DisplayPart, SectionDisplay } from "@/modules/page-builder/display-parts";

type Props = {
  sectionLabel: string;
  /** The whole-section switch's wording; defaults to "the whole section <name> is on". */
  masterLabel?: string;
  parts: DisplayPart[];
  value: SectionDisplay;
  onConfirm: (next: SectionDisplay) => void;
  onClose: () => void;
};

/**
 * "Display settings" of one storefront section: a switch per part it is made of and one for the whole section.
 * Mount it when it should open (the checkboxes start from `value` each time); confirming hands back the new
 * settings, closing discards them. Parts are shown-when-checked; unchecking the whole section greys them out but
 * remembers their state.
 */
export function SectionDisplayDialog({ sectionLabel, masterLabel, parts, value, onConfirm, onClose }: Props) {
  const [enabled, setEnabled] = useState(value.enabled);
  const [hidden, setHidden] = useState(() => new Set(value.hiddenParts));

  // The parts without a group first, then each group under its own heading.
  const groups = [undefined, ...new Set(parts.map((part) => part.group).filter(Boolean))]
    .map((name) => ({ name, parts: parts.filter((part) => part.group === name) }))
    .filter((group) => group.parts.length > 0);

  function togglePart(id: string, shown: boolean) {
    setHidden((current) => {
      const next = new Set(current);
      if (shown) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    // The dialog is portaled to <body>, so `data-page-builder-ui` on it keeps it clickable while the page is in edit mode.
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={`تنظیمات نمایش ${sectionLabel}`} dir="rtl" className="mx-4 max-w-[440px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">تنظیمات نمایش</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="grid gap-4 p-5">
            {groups.map((group) => (
              <div key={group.name ?? "main"} className="grid gap-3">
                {group.name && <h3 className="m-0 text-sm font-bold text-[var(--foreground)]">{group.name}</h3>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.parts.map((part) => (
                    <CheckboxCard key={part.id} isSelected={!hidden.has(part.id)} isDisabled={!enabled} onChange={(shown) => togglePart(part.id, shown)}>{part.label}</CheckboxCard>
                  ))}
                </div>
                <hr className="m-0 border-0 border-t border-[var(--border)]" />
              </div>
            ))}
            <CheckboxCard icon={<Eye size={18} />} isSelected={enabled} onChange={setEnabled}>{masterLabel ?? `کل بخش «${sectionLabel}» فعال باشد`}</CheckboxCard>
          </Modal.Body>
          <Modal.Footer className="gap-3 border-t border-[var(--border)] p-5">
            <Button type="button" variant="primary" onPress={() => onConfirm({ enabled, hiddenParts: [...hidden] })} className="min-h-12 flex-[1.4] rounded-xl text-base font-bold" style={brandPrimaryButtonStyle}>تأیید</Button>
            <Button type="button" variant="outline" onPress={onClose} className="min-h-12 flex-1 rounded-xl text-base font-bold">انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
