"use client";

import Image from "next/image";
import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { GripVertical, Images, ListOrdered, Plus, Trash2 } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import type { MediaChoice } from "@/components/media-library";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpTextarea } from "./ui";
import { BpHomepageMediaField } from "./homepage-media-field";

type PickerTarget = `desktop:${string}` | `mobile:${string}`;

function toMediaChoice(media: HomepageSettings["heroDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر هیرو", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bp-frame relative p-[16px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><BpKicker>{title}</BpKicker>{description && <p className="bp-muted m-0 mt-1 text-[12px] leading-6">{description}</p>}</div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function BlueprintHomepageHeroSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
  const [saving, setSaving] = useState(false);
  const [contentMode, setContentMode] = useState(initialSettings.heroContentMode);
  const [title, setTitle] = useState(initialSettings.heroTitle);
  const [description, setDescription] = useState(initialSettings.heroDescription);
  const [buttonLabel, setButtonLabel] = useState(initialSettings.heroButtonLabel);
  const [slides, setSlides] = useState(() => initialSettings.heroSlides.map((slide) => ({
    id: slide.id,
    href: slide.href,
    desktopMedia: toMediaChoice(slide.desktopMedia),
    mobileMedia: toMediaChoice(slide.mobileMedia),
  })));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [draggedCardSlideId, setDraggedCardSlideId] = useState<string | null>(null);
  const [cardDropTarget, setCardDropTarget] = useState<{ id: string; after: boolean } | null>(null);

  function openOrderEditor() {
    setDraftOrder(slides.map((slide) => slide.id));
    setDraggedSlideId(null);
    setOrderOpen(true);
  }

  function moveDraftSlide(targetId: string, after: boolean) {
    if (!draggedSlideId || draggedSlideId === targetId) return;
    setDraftOrder((current) => {
      const sourceIndex = current.indexOf(draggedSlideId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      let insertIndex = targetIndex + (after ? 1 : 0);
      if (sourceIndex < insertIndex) insertIndex -= 1;
      next.splice(insertIndex, 0, source);
      return next;
    });
  }

  function applyOrder() {
    const slideById = new Map(slides.map((slide) => [slide.id, slide]));
    setSlides(draftOrder.flatMap((id) => {
      const slide = slideById.get(id);
      return slide ? [slide] : [];
    }));
    setOrderOpen(false);
    setDraggedSlideId(null);
  }

  function reorderSlides(sourceId: string, targetId: string, after: boolean) {
    if (sourceId === targetId) return;
    setSlides((current) => {
      const sourceIndex = current.findIndex((slide) => slide.id === sourceId);
      const targetIndex = current.findIndex((slide) => slide.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      let insertIndex = targetIndex + (after ? 1 : 0);
      if (sourceIndex < insertIndex) insertIndex -= 1;
      next.splice(insertIndex, 0, source);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroContentMode: contentMode,
          heroTitle: title,
          heroDescription: description,
          heroButtonLabel: buttonLabel,
          heroButtonHref: slides[0]?.href ?? initialSettings.heroButtonHref,
          heroDesktopMediaId: slides[0]?.desktopMedia?.id ?? null,
          heroMobileMediaId: slides[0]?.mobileMedia?.id ?? null,
          heroSlides: slides.map((slide) => ({
            id: slide.id,
            href: slide.href,
            desktopMediaId: slide.desktopMedia?.id ?? null,
            mobileMediaId: slide.mobileMedia?.id ?? null,
          })),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات هیرو انجام نشد.");
      toast.success("تنظیمات هیرو ذخیره شد", { description: "تصاویر، لینک‌ها و محتوای اسلایدر در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات هیرو انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  const selectedSlide = pickerTarget ? slides.find((slide) => pickerTarget.endsWith(`:${slide.id}`)) : null;
  const selectedMedia = pickerTarget?.startsWith("desktop:") ? selectedSlide?.desktopMedia ?? null : selectedSlide?.mobileMedia ?? null;

  return <>
    <form onSubmit={submit} className="grid gap-2">
      <Panel title="محتوای هیرو" description="نحوه نمایش متن و دکمه روی تصاویر">
        <div className="grid gap-3">
          <BpSelect label="نوع نمایش اسلایدر" value={contentMode} onChange={(event) => setContentMode(event.target.value as HomepageSettings["heroContentMode"])} options={[{ value: "WITH_CONTENT", label: "بنر همراه عنوان، توضیح و دکمه" }, { value: "IMAGE_ONLY", label: "فقط تصویر؛ کل بنر قابل کلیک" }]} />
          {contentMode === "WITH_CONTENT" && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <BpInput label="عنوان اصلی" required maxLength={homepageFieldLimits.heroTitle} value={title} onChange={(event) => setTitle(event.target.value)} />
              <BpInput label="متن دکمه" required maxLength={homepageFieldLimits.heroButtonLabel} value={buttonLabel} onChange={(event) => setButtonLabel(event.target.value)} />
            </div>
            <BpTextarea label="متن کوتاه" required maxLength={homepageFieldLimits.heroDescription} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </>}
        </div>
      </Panel>

      <Panel
        title="اسلایدهای هیرو"
        description="حداکثر ۱۰ تصویر با لینک مقصد اختصاصی"
        action={<div className="flex items-center gap-1.5">
          <BpButton type="button" isIconOnly size="sm" disabled={slides.length < 2} aria-label="ویرایش ترتیب اسلایدها" onClick={openOrderEditor}><ListOrdered size={15} /></BpButton>
          <BpButton type="button" size="sm" variant="primary" disabled={slides.length >= 10} onClick={() => setSlides((current) => [...current, { id: crypto.randomUUID(), href: "/products", desktopMedia: null, mobileMedia: null }])} className="gap-1.5"><Plus size={14} />افزودن اسلاید</BpButton>
        </div>}
      >
        {slides.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {slides.map((slide, index) => {
              const isDropBefore = cardDropTarget?.id === slide.id && !cardDropTarget.after && draggedCardSlideId !== slide.id;
              const isDropAfter = cardDropTarget?.id === slide.id && cardDropTarget.after && draggedCardSlideId !== slide.id;
              return (
                <div
                  key={slide.id}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); setCardDropTarget({ id: slide.id, after: event.clientY > bounds.top + bounds.height / 2 }); }}
                  onDrop={(event) => { event.preventDefault(); const sourceId = draggedCardSlideId ?? event.dataTransfer.getData("text/plain"); if (sourceId) reorderSlides(sourceId, slide.id, cardDropTarget?.id === slide.id ? cardDropTarget.after : false); setDraggedCardSlideId(null); setCardDropTarget(null); }}
                  className={`relative border p-3 transition ${draggedCardSlideId === slide.id ? "border-[var(--bp-accent)] opacity-50" : "border-[var(--bp-divider)]"} ${isDropBefore ? "before:absolute before:inset-x-2 before:-top-1.5 before:z-10 before:h-0.5 before:bg-[var(--bp-accent)]" : ""} ${isDropAfter ? "after:absolute after:inset-x-2 after:-bottom-1.5 after:z-10 after:h-0.5 after:bg-[var(--bp-accent)]" : ""}`}
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", slide.id); setDraggedCardSlideId(slide.id); }} onDragEnd={() => { setDraggedCardSlideId(null); setCardDropTarget(null); }} className="bp-muted cursor-grab active:cursor-grabbing"><GripVertical size={15} /></span>
                      <strong className="text-[12px]">اسلاید {(index + 1).toLocaleString("fa-IR")}</strong>
                    </div>
                    <BpButton type="button" isIconOnly size="sm" variant="ghost" className="bp-btn-danger-icon" aria-label={`حذف اسلاید ${index + 1}`} onClick={() => setSlides((current) => current.filter((item) => item.id !== slide.id))}><Trash2 size={14} /></BpButton>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <BpHomepageMediaField label="تصویر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۹۰۰" media={slide.desktopMedia} onSelect={() => setPickerTarget(`desktop:${slide.id}`)} onClear={() => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, desktopMedia: null } : item))} />
                    <BpHomepageMediaField label="تصویر موبایل" hint="اختیاری؛ ۹۰۰×۱۲۰۰" media={slide.mobileMedia} onSelect={() => setPickerTarget(`mobile:${slide.id}`)} onClear={() => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, mobileMedia: null } : item))} />
                  </div>
                  <div className="mt-2.5">
                    <BpInput label="لینک اختصاصی اسلاید" required dir="ltr" maxLength={homepageFieldLimits.href} value={slide.href} onChange={(event) => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, href: event.target.value } : item))} placeholder="/products یا https://example.com" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">هنوز اسلایدی اضافه نشده است؛ تا زمان افزودن تصویر، بنر پیش‌فرض سایت نمایش داده می‌شود.</p>}
      </Panel>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">محتوا، ترتیب تصاویر و لینک‌های اختصاصی با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات هیرو</BpButton>
      </section>
    </form>

    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (!pickerTarget) return; const id = pickerTarget.slice(pickerTarget.indexOf(":") + 1); setSlides((current) => current.map((slide) => slide.id === id ? pickerTarget.startsWith("desktop:") ? { ...slide, desktopMedia: media } : { ...slide, mobileMedia: media } : slide)); }} />

    <AdminDialog
      open={orderOpen}
      ariaLabel="ویرایش ترتیب اسلایدهای هیرو"
      title="ترتیب اسلایدها"
      description="هر اسلاید را بگیرید و در جایگاه موردنظر رها کنید."
      size="lg"
      onClose={() => { setOrderOpen(false); setDraggedSlideId(null); }}
      actions={<>
        <AdminDialogButton variant="primary" onPress={applyOrder}>اعمال ترتیب</AdminDialogButton>
        <AdminDialogButton variant="secondary" onPress={() => setOrderOpen(false)}>انصراف</AdminDialogButton>
      </>}
    >
      {draftOrder.map((id, index) => {
        const slide = slides.find((item) => item.id === id);
        if (!slide) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); setDraggedSlideId(id); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); moveDraftSlide(id, event.clientY > bounds.top + bounds.height / 2); }}
            onDrop={(event) => { event.preventDefault(); setDraggedSlideId(null); }}
            onDragEnd={() => setDraggedSlideId(null)}
            className={`flex cursor-grab items-center gap-3 border p-2.5 transition active:cursor-grabbing ${draggedSlideId === id ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]/40 opacity-55" : "border-[var(--bp-divider)] bg-[var(--bp-bg)]"}`}
          >
            <GripVertical size={17} className="bp-muted shrink-0" />
            <span className="bp-muted grid size-8 shrink-0 place-items-center bg-[var(--bp-card)] text-[12px] font-bold">{(index + 1).toLocaleString("fa-IR")}</span>
            <span className="relative h-12 w-20 shrink-0 overflow-hidden bg-[var(--bp-card)]">{slide.desktopMedia ? <Image src={slide.desktopMedia.url} alt={slide.desktopMedia.title} fill sizes="80px" className="object-cover" /> : <span className="bp-muted grid h-full place-items-center"><Images size={16} /></span>}</span>
            <span className="min-w-0 flex-1"><strong className="block text-[13px]">اسلاید {(index + 1).toLocaleString("fa-IR")}</strong><span dir="ltr" className="bp-muted mt-0.5 block truncate text-[10px]">{slide.href}</span></span>
          </div>
        );
      })}
    </AdminDialog>
  </>;
}
