"use client";

import { useState } from "react";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { X } from "lucide-react";
import { InlineAlert } from "@/components/inline-alert";
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
 * The page builder's "name, tagline and logo" form. Unlike the layout edits it saves on its own (these live in
 * the store's general and brand settings, not in the page draft) and the page is refreshed to show the result.
 */
export function PageBuilderIdentityDialog({ initial, onSaved, onClose }: { initial: IdentityValues; onSaved: () => void; onClose: () => void }) {
  const [storeName, setStoreName] = useState(initial.storeName);
  const [tagline, setTagline] = useState(initial.tagline);
  const [logo, setLogo] = useState(initial.logo);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function showFieldErrors(next: FieldErrors) {
    setErrors(next);
    const first = (["storeName", "tagline"] as const).find((field) => next[field]);
    if (first) document.getElementById(fieldIds[first])?.focus();
  }

  async function submit() {
    setFormError("");
    const parsed = storefrontIdentityInputSchema.safeParse({ storeName, tagline, mainLogoMediaId: logo?.id ?? null });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      showFieldErrors({ storeName: fieldErrors.storeName?.[0], tagline: fieldErrors.tagline?.[0] });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/storefront-identity", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const issues = result?.issues as Record<string, string[] | undefined> | undefined;
        if (issues?.storeName || issues?.tagline) showFieldErrors({ storeName: issues.storeName?.[0], tagline: issues.tagline?.[0] });
        throw new Error(result?.message ?? "ذخیره نام، شعار و لوگو انجام نشد.");
      }
      toast.success("نام، شعار و لوگو ذخیره شد");
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "ذخیره نام، شعار و لوگو انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Hidden (not unmounted) while the media library is open, so the typed values survive and the library, which stacks below this dialog, is visible. */}
      <Modal.Backdrop isOpen={!pickerOpen} onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label="ویرایش نام، شعار و لوگو" dir="rtl" className="p-0 mx-4 max-w-[480px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="text-base font-bold">نام، شعار و لوگو</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="m-0 grid gap-1 p-5">
              <TextField id={fieldIds.storeName} label="نام فروشگاه" required value={storeName} maxLength={generalSettingsFieldLimits.storeName} error={errors.storeName} onChange={(event) => { setStoreName(event.target.value); setErrors((current) => ({ ...current, storeName: undefined })); }} />
              <TextField id={fieldIds.tagline} label="شعار فروشگاه" required value={tagline} maxLength={generalSettingsFieldLimits.tagline} error={errors.tagline} onChange={(event) => { setTagline(event.target.value); setErrors((current) => ({ ...current, tagline: undefined })); }} />
              <BuilderMediaField id="builder-identity-logo" label="لوگوی فروشگاه" media={logo} hint="بدون لوگو، نام فروشگاه در سربرگ نمایش داده می‌شود." disabled={saving} onPick={() => setPickerOpen(true)} onClear={() => setLogo(null)} />
              {formError && <InlineAlert status="danger" compact className="mt-2">{formError}</InlineAlert>}
            </Modal.Body>
            <Modal.Footer className="m-0 gap-3 border-t border-[var(--border)] p-5">
              <Button type="button" variant="primary" isPending={saving} onPress={() => void submit()} className="min-h-11 flex-[1.4] rounded-xl text-sm font-bold" style={brandPrimaryButtonStyle}>
                {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}ذخیره</>}
              </Button>
              <Button type="button" variant="outline" isDisabled={saving} onPress={onClose} className="min-h-11 flex-1 rounded-xl text-sm font-bold">انصراف</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <MediaPickerDialog open={pickerOpen} scope="BRAND" allowedTypes={["IMAGE"]} selected={logo ? [logo] : []} onClose={() => setPickerOpen(false)} onConfirm={(items) => { setLogo(items[0] ?? null); setPickerOpen(false); }} />
    </>
  );
}
