"use client";

import { useState } from "react";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { ArrowRight, Trash2, X } from "lucide-react";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { PageBuilderConfirmDialog } from "@/components/page-builder-confirm-dialog";
import { BuilderImagePreview } from "@/components/page-builder-image-preview";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { heroImageSizeHints, heroSettingsPayload, heroSlideLabel, validateHeroSlide, type HeroSlideDraft, type HeroSlideErrors, type HeroValues } from "@/modules/page-builder/hero-payload";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

async function saveHero(hero: HeroValues, slides: HeroSlideDraft[]) {
  const response = await fetch("/api/admin/settings/homepage/hero", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(heroSettingsPayload(hero, slides)) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? "ذخیره بنرهای اسلایدر انجام نشد.");
}

/**
 * The form for one slider banner — edit an existing one (`slideId`) or add a new one (`slideId` null): its desktop
 * image, an optional mobile image and the link it goes to; an existing banner can also be deleted. It saves on its
 * own through the hero settings API (the whole slider is sent, since the API takes it at once) and the page is
 * refreshed afterwards. The back arrow returns to the banner list, the X closes the builder's dialogs.
 */
export function PageBuilderHeroSlideDialog({ hero, slideId, onSaved, onBack, onClose }: { hero: HeroValues; slideId: string | null; onSaved: () => void; onBack: () => void; onClose: () => void }) {
  const existingIndex = slideId ? hero.slides.findIndex((slide) => slide.id === slideId) : -1;
  const isNew = existingIndex < 0;
  const [slide, setSlide] = useState<HeroSlideDraft>(() => (isNew ? { id: crypto.randomUUID(), href: hero.buttonHref, desktopMedia: null, mobileMedia: null } : hero.slides[existingIndex]));
  const [errors, setErrors] = useState<HeroSlideErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<"desktop" | "mobile" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const full = isNew && hero.slides.length >= homepageFieldLimits.heroSlides;
  const title = isNew ? "افزودن بنر اسلایدر" : `ویرایش ${heroSlideLabel(existingIndex)}`;
  const pickedMedia = picker ? slide[picker === "desktop" ? "desktopMedia" : "mobileMedia"] : null;

  async function persist(slides: HeroSlideDraft[], successMessage: string) {
    setSaving(true);
    setFormError("");
    try {
      await saveHero(hero, slides);
      toast.success(successMessage);
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "ذخیره بنر انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const slideErrors = validateHeroSlide(slide);
    setErrors(slideErrors);
    if (slideErrors.desktop || slideErrors.href) {
      document.getElementById(slideErrors.desktop ? "builder-hero-desktop" : "builder-hero-href")?.focus();
      return;
    }
    await persist(isNew ? [...hero.slides, slide] : hero.slides.map((item) => (item.id === slide.id ? slide : item)), isNew ? "بنر به اسلایدر اضافه شد" : "بنر ذخیره شد");
  }

  async function confirmDelete() {
    setConfirmingDelete(false);
    await persist(hero.slides.filter((item) => item.id !== slide.id), "بنر حذف شد");
  }

  return (
    <>
      <Modal.Backdrop isOpen={picker === null && !confirmingDelete} onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
        <Modal.Container size="md" placement="center">
          <Modal.Dialog data-page-builder-ui aria-label={title} dir="rtl" className="p-0 mx-4 max-w-[560px] bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] py-3 ps-5 pe-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button type="button" isIconOnly variant="ghost" isDisabled={saving} aria-label="بازگشت به فهرست بنرها" onPress={onBack} className="size-9 min-h-9 min-w-9 text-[var(--muted)]"><ArrowRight size={20} /></Button>
                <Modal.Heading className="text-base font-bold">{title}</Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="m-0 grid max-h-[62vh] gap-5 overflow-y-auto p-5">
              {full && <InlineAlert status="warning" compact>اسلایدر به سقف {homepageFieldLimits.heroSlides.toLocaleString("fa-IR")} بنر رسیده است؛ برای افزودن، ابتدا یکی از بنرها را حذف کنید.</InlineAlert>}
              <BuilderImagePreview id="builder-hero-desktop" label="تصویر دسکتاپ" required media={slide.desktopMedia} hint={<>اندازهٔ پیشنهادی: <span dir="ltr">{heroImageSizeHints.desktop}</span> پیکسل</>} error={errors.desktop} disabled={saving} onPick={() => setPicker("desktop")} />
              <BuilderImagePreview id="builder-hero-mobile" label="تصویر موبایل" media={slide.mobileMedia} heightClass="h-32" hint={<>اختیاری؛ بدون آن تصویر دسکتاپ نمایش داده می‌شود. اندازهٔ پیشنهادی: <span dir="ltr">{heroImageSizeHints.mobile}</span> پیکسل</>} disabled={saving} onPick={() => setPicker("mobile")} onClear={() => setSlide((current) => ({ ...current, mobileMedia: null }))} />
              <TextField id="builder-hero-href" label="لینک مقصد (URL)" dir="ltr" value={slide.href} maxLength={homepageFieldLimits.href} error={errors.href} disabled={saving} onChange={(event) => { setSlide((current) => ({ ...current, href: event.target.value })); setErrors((current) => ({ ...current, href: undefined })); }} />
              {formError && <InlineAlert status="danger" compact>{formError}</InlineAlert>}
            </Modal.Body>
            <Modal.Footer className="m-0 justify-start gap-3 border-t border-[var(--border)] p-5">
              <Button type="button" variant="primary" isPending={saving} isDisabled={full} onPress={() => void submit()} className="min-h-11 min-w-24 rounded-xl px-6 text-sm font-bold" style={brandPrimaryButtonStyle}>
                {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isNew ? "افزودن" : "تأیید"}</>}
              </Button>
              <Button type="button" variant="outline" isDisabled={saving} onPress={onBack} className="min-h-11 rounded-xl px-6 text-sm font-bold">انصراف</Button>
              {!isNew && <Button type="button" variant="ghost" isDisabled={saving} onPress={() => setConfirmingDelete(true)} className="mr-auto min-h-11 gap-1.5 rounded-xl px-3 text-sm font-bold text-[var(--danger)]"><Trash2 size={16} />حذف</Button>}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {confirmingDelete && (
        <PageBuilderConfirmDialog title={`حذف ${heroSlideLabel(existingIndex)}`} confirmLabel="حذف بنر" onConfirm={() => void confirmDelete()} onClose={() => setConfirmingDelete(false)}>
          این بنر از اسلایدر حذف می‌شود و <b className="text-[var(--foreground)]">امکان بازگرداندن آن وجود ندارد.</b> آیا از حذف آن مطمئن هستید؟
        </PageBuilderConfirmDialog>
      )}
      <MediaPickerDialog open={picker !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={pickedMedia ? [pickedMedia] : []} onClose={() => setPicker(null)} onConfirm={(items) => { if (picker) { setSlide((current) => ({ ...current, [picker === "desktop" ? "desktopMedia" : "mobileMedia"]: items[0] ?? null })); if (picker === "desktop") setErrors((current) => ({ ...current, desktop: undefined })); } setPicker(null); }} />
    </>
  );
}
