"use client";

import { useState, type ReactNode } from "react";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import { Trash2, X } from "lucide-react";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { BuilderMediaField } from "@/components/page-builder-media-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { heroSettingsPayload, validateHeroSlide, type HeroSlideDraft, type HeroSlideErrors, type HeroValues } from "@/modules/page-builder/hero-payload";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

type PickerTarget = { slideId: string; kind: "desktop" | "mobile" };

async function saveHero(hero: HeroValues, slides: HeroSlideDraft[]) {
  const response = await fetch("/api/admin/settings/homepage/hero", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(heroSettingsPayload(hero, slides)) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? "ذخیره بنرهای اسلایدر انجام نشد.");
}

/**
 * The shell the two slider forms share: a builder dialog that hides itself (staying mounted, so nothing typed is
 * lost) while the media library is open, because the library stacks below the builder's dialogs.
 */
function HeroDialogShell({ title, hidden, saving, saveLabel, canSave = true, onSave, onClose, children }: { title: string; hidden: boolean; saving: boolean; saveLabel: string; canSave?: boolean; onSave: () => void; onClose: () => void; children: ReactNode }) {
  return (
    <Modal.Backdrop isOpen={!hidden} onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={title} dir="rtl" className="mx-4 max-w-[640px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">{title}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="grid max-h-[60vh] gap-4 overflow-y-auto p-5">{children}</Modal.Body>
          <Modal.Footer className="gap-3 border-t border-[var(--border)] p-5">
            <Button type="button" variant="primary" isPending={saving} isDisabled={!canSave} onPress={onSave} className="min-h-11 flex-[1.4] rounded-xl text-sm font-bold" style={brandPrimaryButtonStyle}>
              {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{saveLabel}</>}
            </Button>
            <Button type="button" variant="outline" isDisabled={saving} onPress={onClose} className="min-h-11 flex-1 rounded-xl text-sm font-bold">انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/** One banner's editable fields: its two images and its link. */
function SlideFields({ slide, errors, saving, onPick, onClear, onHrefChange }: { slide: HeroSlideDraft; errors: HeroSlideErrors | undefined; saving: boolean; onPick: (kind: PickerTarget["kind"]) => void; onClear: (kind: PickerTarget["kind"]) => void; onHrefChange: (href: string) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <BuilderMediaField id={`builder-hero-${slide.id}-desktop`} label="تصویر دسکتاپ" required media={slide.desktopMedia} error={errors?.desktop} disabled={saving} onPick={() => onPick("desktop")} onClear={() => onClear("desktop")} />
        <BuilderMediaField id={`builder-hero-${slide.id}-mobile`} label="تصویر موبایل" media={slide.mobileMedia} hint="اختیاری؛ بدون آن تصویر دسکتاپ نمایش داده می‌شود." disabled={saving} onPick={() => onPick("mobile")} onClear={() => onClear("mobile")} />
      </div>
      <TextField id={`builder-hero-${slide.id}-href`} label="لینک بنر" dir="ltr" value={slide.href} maxLength={homepageFieldLimits.href} error={errors?.href} disabled={saving} onChange={(event) => onHrefChange(event.target.value)} />
    </div>
  );
}

/** Applies a library choice to one image of one banner. */
function withMedia(slides: HeroSlideDraft[], target: PickerTarget, media: MediaChoice | null) {
  return slides.map((slide) => (slide.id === target.slideId ? { ...slide, [target.kind === "desktop" ? "desktopMedia" : "mobileMedia"]: media } : slide));
}

/**
 * "Edit the images of each banner": every banner of the slider with its desktop image, mobile image and link,
 * and a way to remove it. Saves on its own through the hero settings API and the page is refreshed afterwards.
 */
export function PageBuilderHeroImagesDialog({ hero, onSaved, onClose }: { hero: HeroValues; onSaved: () => void; onClose: () => void }) {
  const [slides, setSlides] = useState(hero.slides);
  const [errors, setErrors] = useState<Record<string, HeroSlideErrors>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const pickedMedia = picker ? slides.find((slide) => slide.id === picker.slideId)?.[picker.kind === "desktop" ? "desktopMedia" : "mobileMedia"] ?? null : null;

  function changeSlide(id: string, patch: Partial<HeroSlideDraft>) {
    setSlides((current) => current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
    setErrors((current) => (current[id] ? { ...current, [id]: {} } : current));
  }

  async function submit() {
    setFormError("");
    const next: Record<string, HeroSlideErrors> = {};
    for (const slide of slides) {
      const slideErrors = validateHeroSlide(slide);
      if (slideErrors.desktop || slideErrors.href) next[slide.id] = slideErrors;
    }
    setErrors(next);
    const invalid = slides.find((slide) => next[slide.id]);
    if (invalid) {
      document.getElementById(`builder-hero-${invalid.id}-${next[invalid.id].desktop ? "desktop" : "href"}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveHero(hero, slides);
      toast.success("بنرهای اسلایدر ذخیره شد");
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "ذخیره بنرهای اسلایدر انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <HeroDialogShell title="عکس‌های بنرها" hidden={picker !== null} saving={saving} saveLabel="ذخیره" onSave={() => void submit()} onClose={onClose}>
        {slides.length === 0 && <p className="m-0 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm leading-7 text-[var(--muted)]">هنوز بنری برای اسلایدر ثبت نشده است. از «افزودن بنر اسلایدر» استفاده کنید.</p>}
        {slides.map((slide, index) => (
          <section key={slide.id} className="grid gap-3 rounded-xl border border-[var(--border)] p-4" aria-label={`بنر ${(index + 1).toLocaleString("fa-IR")}`}>
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm font-bold">بنر {(index + 1).toLocaleString("fa-IR")}</strong>
              <Button type="button" isIconOnly variant="ghost" isDisabled={saving} aria-label={`حذف بنر ${(index + 1).toLocaleString("fa-IR")}`} onPress={() => setSlides((current) => current.filter((item) => item.id !== slide.id))} className="size-9 min-h-9 min-w-9 text-[var(--danger)]"><Trash2 size={16} /></Button>
            </div>
            <SlideFields slide={slide} errors={errors[slide.id]} saving={saving} onPick={(kind) => setPicker({ slideId: slide.id, kind })} onClear={(kind) => setSlides((current) => withMedia(current, { slideId: slide.id, kind }, null))} onHrefChange={(href) => changeSlide(slide.id, { href })} />
          </section>
        ))}
        {formError && <InlineAlert status="danger" compact>{formError}</InlineAlert>}
      </HeroDialogShell>
      <MediaPickerDialog open={picker !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={pickedMedia ? [pickedMedia] : []} onClose={() => setPicker(null)} onConfirm={(items) => { if (picker) { setSlides((current) => withMedia(current, picker, items[0] ?? null)); setErrors((current) => (current[picker.slideId] ? { ...current, [picker.slideId]: {} } : current)); } setPicker(null); }} />
    </>
  );
}

/**
 * "Add a slider banner": one new banner (desktop image, optional mobile image, link) appended to the slider.
 * Saves on its own through the hero settings API and the page is refreshed afterwards.
 */
export function PageBuilderHeroAddDialog({ hero, onSaved, onClose }: { hero: HeroValues; onSaved: () => void; onClose: () => void }) {
  const [slide, setSlide] = useState<HeroSlideDraft>(() => ({ id: crypto.randomUUID(), href: hero.buttonHref, desktopMedia: null, mobileMedia: null }));
  const [errors, setErrors] = useState<HeroSlideErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget["kind"] | null>(null);
  const full = hero.slides.length >= homepageFieldLimits.heroSlides;
  const pickedMedia = picker ? slide[picker === "desktop" ? "desktopMedia" : "mobileMedia"] : null;

  async function submit() {
    setFormError("");
    const slideErrors = validateHeroSlide(slide);
    setErrors(slideErrors);
    if (slideErrors.desktop || slideErrors.href) {
      document.getElementById(`builder-hero-${slide.id}-${slideErrors.desktop ? "desktop" : "href"}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveHero(hero, [...hero.slides, slide]);
      toast.success("بنر به اسلایدر اضافه شد");
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "افزودن بنر انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <HeroDialogShell title="افزودن بنر اسلایدر" hidden={picker !== null} saving={saving} saveLabel="افزودن بنر" canSave={!full} onSave={() => void submit()} onClose={onClose}>
        {full && <InlineAlert status="warning" compact>اسلایدر به سقف {homepageFieldLimits.heroSlides.toLocaleString("fa-IR")} بنر رسیده است؛ برای افزودن، ابتدا یکی از بنرها را حذف کنید.</InlineAlert>}
        <SlideFields slide={slide} errors={errors} saving={saving} onPick={setPicker} onClear={(kind) => setSlide((current) => ({ ...current, [kind === "desktop" ? "desktopMedia" : "mobileMedia"]: null }))} onHrefChange={(href) => { setSlide((current) => ({ ...current, href })); setErrors((current) => ({ ...current, href: undefined })); }} />
        {formError && <InlineAlert status="danger" compact>{formError}</InlineAlert>}
      </HeroDialogShell>
      <MediaPickerDialog open={picker !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={pickedMedia ? [pickedMedia] : []} onClose={() => setPicker(null)} onConfirm={(items) => { if (picker) { setSlide((current) => ({ ...current, [picker === "desktop" ? "desktopMedia" : "mobileMedia"]: items[0] ?? null })); if (picker === "desktop") setErrors((current) => ({ ...current, desktop: undefined })); } setPicker(null); }} />
    </>
  );
}
