"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { ArrowRight, Smartphone, Trash2, X } from "lucide-react";
import { CheckboxCard } from "@/components/checkbox-card";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { PageBuilderConfirmDialog } from "@/components/page-builder-confirm-dialog";
import { BuilderImagePreview } from "@/components/page-builder-image-preview";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { heroSlideLabel, validateHeroSlide, type HeroSlideDraft, type HeroSlideErrors } from "@/modules/page-builder/hero-payload";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

/**
 * The form for one banner — edit an existing one (`itemId`) or add a new one (`itemId` null): its picture, on a slider
 * an optional smaller picture for phones, and the link it goes to; where allowed it can also be deleted. It doesn't
 * know where banners are stored: `save` gets the whole new list and stores it. The back arrow returns to the banner
 * list, the X closes the builder's dialogs.
 */
export function BannerItemDialog({ items, itemId, allowMobile, allowDelete, maxItems, sizeHints, save, onSaved, onBack, onClose }: {
  items: HeroSlideDraft[];
  itemId: string | null;
  allowMobile: boolean;
  allowDelete: boolean;
  /** How many banners the set may hold; null when its size is fixed by its look (no adding). */
  maxItems: number | null;
  /** Recommended picture sizes, when there are any to recommend. */
  sizeHints?: { desktop: string; mobile: string };
  /** Hands the new list of banners to the page builder's draft; nothing is sent to the server from here. */
  save: (next: HeroSlideDraft[]) => void;
  onSaved: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const existingIndex = itemId ? items.findIndex((item) => item.id === itemId) : -1;
  const isNew = existingIndex < 0;
  const [item, setItem] = useState<HeroSlideDraft>(() => (isNew ? { id: crypto.randomUUID(), href: "/products", desktopMedia: null, mobileMedia: null } : items[existingIndex]));
  const [errors, setErrors] = useState<HeroSlideErrors>({});
  const [picker, setPicker] = useState<"desktop" | "mobile" | null>(null);
  // The phone picture is opt-in: closed unless the banner already has one. Closing it again drops that picture.
  const [wantsMobile, setWantsMobile] = useState(Boolean(item.mobileMedia));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const full = isNew && (maxItems === null || items.length >= maxItems);
  const title = isNew ? "افزودن بنر" : `ویرایش ${heroSlideLabel(existingIndex)}`;
  const pickedMedia = picker ? item[picker === "desktop" ? "desktopMedia" : "mobileMedia"] : null;

  function persist(next: HeroSlideDraft[]) {
    save(next);
    onSaved();
  }

  function submit() {
    const itemErrors = validateHeroSlide(item);
    setErrors(itemErrors);
    if (itemErrors.desktop || itemErrors.href) {
      document.getElementById(itemErrors.desktop ? "builder-banner-desktop" : "builder-banner-href")?.focus();
      return;
    }
    persist(isNew ? [...items, item] : items.map((current) => (current.id === item.id ? item : current)));
  }

  function confirmDelete() {
    setConfirmingDelete(false);
    persist(items.filter((current) => current.id !== item.id));
  }

  return (
    <>
      <Modal.Backdrop isOpen={picker === null && !confirmingDelete} onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="md" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label={title} dir="rtl" className="p-0 mx-4 max-w-[560px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] py-3 ps-5 pe-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button type="button" isIconOnly variant="ghost" aria-label="بازگشت به فهرست بنرها" onPress={onBack} className="size-9 min-h-9 min-w-9 text-[var(--muted)]"><ArrowRight size={20} /></Button>
                <Modal.Heading className="text-base font-bold">{title}</Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="m-0 grid max-h-[62vh] gap-5 overflow-y-auto p-5">
              {full && <InlineAlert status="warning" compact>{maxItems === null ? "تعداد بنرهای این ظاهر ثابت است؛ برای افزودن بنر ظاهر را عوض کنید." : `این اسلایدر به سقف ${maxItems.toLocaleString("fa-IR")} بنر رسیده است؛ برای افزودن، ابتدا یکی از بنرها را حذف کنید.`}</InlineAlert>}
              <BuilderImagePreview id="builder-banner-desktop" label={allowMobile ? "تصویر دسکتاپ" : "تصویر بنر"} required media={item.desktopMedia} hint={sizeHints ? <>اندازهٔ پیشنهادی: <span dir="ltr">{sizeHints.desktop}</span> پیکسل</> : undefined} error={errors.desktop} onPick={() => setPicker("desktop")} />
              {allowMobile && <CheckboxCard icon={<Smartphone size={18} />} isSelected={wantsMobile} onChange={(next) => { setWantsMobile(next); if (!next) setItem((current) => ({ ...current, mobileMedia: null })); }}>افزودن تصویر مخصوص موبایل</CheckboxCard>}
              {allowMobile && wantsMobile && <BuilderImagePreview id="builder-banner-mobile" label="تصویر موبایل" media={item.mobileMedia} heightClass="h-32" hint={<>اختیاری؛ بدون آن تصویر دسکتاپ نمایش داده می‌شود.{sizeHints && <> اندازهٔ پیشنهادی: <span dir="ltr">{sizeHints.mobile}</span> پیکسل</>}</>} onPick={() => setPicker("mobile")} onClear={() => setItem((current) => ({ ...current, mobileMedia: null }))} />}
              <TextField id="builder-banner-href" label="لینک مقصد (URL)" dir="ltr" value={item.href} maxLength={homepageFieldLimits.href} error={errors.href} onChange={(event) => { setItem((current) => ({ ...current, href: event.target.value })); setErrors((current) => ({ ...current, href: undefined })); }} />
            </Modal.Body>
            <Modal.Footer className="m-0 justify-start gap-3 border-t border-[var(--border)] p-5">
              <Button type="button" variant="primary" isDisabled={full} onPress={submit} className="min-h-11 min-w-24 rounded-xl px-6 text-sm font-bold" style={brandPrimaryButtonStyle}>{isNew ? "افزودن" : "تأیید"}</Button>
              <Button type="button" variant="outline" onPress={onBack} className="min-h-11 rounded-xl px-6 text-sm font-bold">انصراف</Button>
              {!isNew && allowDelete && <Button type="button" variant="ghost" onPress={() => setConfirmingDelete(true)} className="mr-auto min-h-11 gap-1.5 rounded-xl px-3 text-sm font-bold text-[var(--danger)]"><Trash2 size={16} />حذف</Button>}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {confirmingDelete && (
        <PageBuilderConfirmDialog title={`حذف ${heroSlideLabel(existingIndex)}`} confirmLabel="حذف بنر" onConfirm={confirmDelete} onClose={() => setConfirmingDelete(false)}>
          این بنر حذف می‌شود و <b className="text-[var(--foreground)]">امکان بازگرداندن آن وجود ندارد.</b> آیا از حذف آن مطمئن هستید؟
        </PageBuilderConfirmDialog>
      )}
      <MediaPickerDialog open={picker !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={pickedMedia ? [pickedMedia] : []} onClose={() => setPicker(null)} onConfirm={(chosen) => { if (picker) { setItem((current) => ({ ...current, [picker === "desktop" ? "desktopMedia" : "mobileMedia"]: chosen[0] ?? null })); if (picker === "desktop") setErrors((current) => ({ ...current, desktop: undefined })); } setPicker(null); }} />
    </>
  );
}
