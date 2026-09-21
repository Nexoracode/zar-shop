"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { X } from "lucide-react";
import { TextField } from "@/components/form-field";
import type { MediaChoice } from "@/components/media-library";
import { BuilderMediaField } from "@/components/page-builder-media-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { storefrontIdentityInputSchema } from "@/modules/settings/storefront-identity";

export type IdentityValues = { storeName: string; tagline: string; logo: MediaChoice | null };
type FieldErrors = Partial<Record<"storeName" | "tagline", string>>;

const fieldIds = { storeName: "builder-identity-store-name", tagline: "builder-identity-tagline" } as const;

/**
 * The page builder's "name, tagline and logo" form. It only validates: the entered values go into the builder's draft
 * (`onConfirm`) and are saved with the rest of the page, so nothing is sent to the server from here.
 */
export function PageBuilderIdentityDialog({ initial, onConfirm, onClose }: { initial: IdentityValues; onConfirm: (values: IdentityValues) => void; onClose: () => void }) {
  const [storeName, setStoreName] = useState(initial.storeName);
  const [tagline, setTagline] = useState(initial.tagline);
  const [logo, setLogo] = useState(initial.logo);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  function showFieldErrors(next: FieldErrors) {
    setErrors(next);
    const first = (["storeName", "tagline"] as const).find((field) => next[field]);
    if (first) document.getElementById(fieldIds[first])?.focus();
  }

  function submit() {
    const parsed = storefrontIdentityInputSchema.safeParse({ storeName, tagline, mainLogoMediaId: logo?.id ?? null });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      showFieldErrors({ storeName: fieldErrors.storeName?.[0], tagline: fieldErrors.tagline?.[0] });
      return;
    }
    setErrors({});
    onConfirm({ storeName: parsed.data.storeName, tagline: parsed.data.tagline, logo });
  }

  return (
    <>
      {/* Hidden (not unmounted) while the media library is open, so the typed values survive and the library, which stacks below this dialog, is visible. */}
      <Modal.Backdrop isOpen={!pickerOpen} onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label="ویرایش نام، شعار و لوگو" dir="rtl" className="p-0 mx-4 max-w-[480px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] py-3 ps-5 pe-3">
              <Modal.Heading className="text-base font-bold">نام، شعار و لوگو</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="m-0 grid gap-1 p-5">
              <TextField id={fieldIds.storeName} label="نام فروشگاه" required value={storeName} maxLength={generalSettingsFieldLimits.storeName} error={errors.storeName} onChange={(event) => { setStoreName(event.target.value); setErrors((current) => ({ ...current, storeName: undefined })); }} />
              <TextField id={fieldIds.tagline} label="شعار فروشگاه" required value={tagline} maxLength={generalSettingsFieldLimits.tagline} error={errors.tagline} onChange={(event) => { setTagline(event.target.value); setErrors((current) => ({ ...current, tagline: undefined })); }} />
              <BuilderMediaField id="builder-identity-logo" label="لوگوی فروشگاه" media={logo} hint="بدون لوگو، نام فروشگاه در سربرگ نمایش داده می‌شود." onPick={() => setPickerOpen(true)} onClear={() => setLogo(null)} />
            </Modal.Body>
            <Modal.Footer className="m-0 justify-start gap-3 border-t border-[var(--border)] p-5">
              <Button type="button" variant="primary" onPress={submit} className="min-h-11 min-w-24 rounded-xl px-6 text-sm font-bold" style={brandPrimaryButtonStyle}>تأیید</Button>
              <Button type="button" variant="outline" onPress={onClose} className="min-h-11 rounded-xl px-6 text-sm font-bold">انصراف</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <MediaPickerDialog open={pickerOpen} scope="BRAND" allowedTypes={["IMAGE"]} selected={logo ? [logo] : []} onClose={() => setPickerOpen(false)} onConfirm={(items) => { setLogo(items[0] ?? null); setPickerOpen(false); }} />
    </>
  );
}
