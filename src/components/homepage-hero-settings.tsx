"use client";

import Image from "next/image";
import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, Input, Label, Modal, TextArea, toast } from "@heroui/react";
import { GripVertical, Images, ListOrdered, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { HeroSelectField } from "@/components/hero-select-field";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

type PickerTarget = `desktop:${string}` | `mobile:${string}`;

function toMediaChoice(media: HomepageSettings["heroDesktopMedia"]): MediaChoice | null {
  return media ? { id: media.id, title: media.title || media.alt || "تصویر هیرو", url: media.url, type: "IMAGE", mimeType: media.mimeType } : null;
}

export function HomepageHeroSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
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
    <form onSubmit={submit} className="admin-sticky-save-form grid gap-5" dir="rtl">
      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Sparkles size={19} /></span>
          <div className="min-w-0"><Card.Title className="text-base font-bold">محتوای هیرو</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">نحوه نمایش متن و دکمه روی تصاویر</Card.Description></div>
          <div className="mr-auto"><AdminSectionHelp title="محتوای هیرو" summary="حالت نمایش مشخص می‌کند متن روی همه اسلایدها قرار بگیرد یا هر تصویر به‌تنهایی بنر کامل باشد." blocks={[{ title: "همراه محتوا", description: "عنوان، توضیح و متن دکمه روی اسلایدها نمایش داده می‌شوند و لینک اختصاصی هر اسلاید مقصد دکمه را مشخص می‌کند." }, { title: "فقط تصویر", description: "هیچ متن یا دکمه‌ای روی تصویر قرار نمی‌گیرد و تمام سطح هر اسلاید به لینک اختصاصی همان اسلاید متصل می‌شود." }, { title: "انتخاب حالت", tone: "important", description: "اگر متن و دکمه داخل خود فایل تصویر طراحی شده‌اند، حالت «فقط تصویر» را انتخاب کنید تا محتوا دوباره روی بنر تکرار نشود." }]} /></div>
        </Card.Header>
        <Card.Content className="grid gap-4 p-5">
          <HeroSelectField name="heroContentMode" label="نوع نمایش اسلایدر" value={contentMode} onValueChange={(value) => setContentMode(value as HomepageSettings["heroContentMode"])} includeEmptyOption={false} options={[{ value: "WITH_CONTENT", label: "بنر همراه عنوان، توضیح و دکمه" }, { value: "IMAGE_ONLY", label: "فقط تصویر؛ کل بنر قابل کلیک" }]} />
          {contentMode === "WITH_CONTENT" ? <>
            <div className="grid gap-4 lg:grid-cols-2"><Field label="عنوان اصلی"><Input required value={title} onChange={(event) => setTitle(event.target.value)} variant="secondary" className={adminFieldClass} /></Field><Field label="متن دکمه"><Input required value={buttonLabel} onChange={(event) => setButtonLabel(event.target.value)} variant="secondary" className={adminFieldClass} /></Field></div>
            <Field label="متن کوتاه"><TextArea required value={description} onChange={(event) => setDescription(event.target.value)} rows={3} variant="secondary" className={adminFieldClass} /></Field>
          </> : null}
        </Card.Content>
      </Card>

      <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Header className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Images size={19} /></span><div><Card.Title className="text-base font-bold">اسلایدهای هیرو</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">حداکثر ۱۰ تصویر با لینک مقصد اختصاصی</Card.Description></div></div>
          <div className="flex shrink-0 items-center gap-2"><AdminSectionHelp title="اسلایدهای هیرو" summary="هر اسلاید تصویر دسکتاپ، نسخه اختیاری موبایل و لینک مقصد مستقل دارد." blocks={[{ title: "ساخت اسلاید", items: ["اسلاید جدید اضافه کنید.", "تصویر دسکتاپ را انتخاب و در صورت نیاز نسخه عمودی موبایل را ثبت کنید.", "لینک داخلی یا خارجی معتبر همان اسلاید را وارد کنید."] }, { title: "تغییر ترتیب", description: "کارت‌ها را مستقیماً با دستگیره جابه‌جا کنید یا از آیکون ترتیب برای بازکردن نمای فشرده استفاده کنید." }, { title: "نمایش موبایل", tone: "important", description: "اگر تصویر موبایل خالی باشد، تصویر دسکتاپ استفاده می‌شود. برای جلوگیری از برش نامناسب، نسخه موبایل جداگانه پیشنهاد می‌شود." }]} /><Button type="button" isIconOnly size="sm" variant="secondary" isDisabled={slides.length < 2} aria-label="ویرایش ترتیب اسلایدها" onPress={openOrderEditor}><ListOrdered size={16} /></Button><Button type="button" size="sm" variant="secondary" isDisabled={slides.length >= 10} onPress={() => setSlides((current) => [...current, { id: crypto.randomUUID(), href: "/products", desktopMedia: null, mobileMedia: null }])} className="shrink-0 gap-1.5 text-xs"><Plus size={14} />افزودن اسلاید</Button></div>
        </Card.Header>
        <Card.Content className="p-5">
          {slides.length ? <div className="grid gap-4 xl:grid-cols-2">{slides.map((slide, index) => {
            const isDropBefore = cardDropTarget?.id === slide.id && !cardDropTarget.after && draggedCardSlideId !== slide.id;
            const isDropAfter = cardDropTarget?.id === slide.id && cardDropTarget.after && draggedCardSlideId !== slide.id;
            return <div key={slide.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); setCardDropTarget({ id: slide.id, after: event.clientY > bounds.top + bounds.height / 2 }); }} onDrop={(event) => { event.preventDefault(); const sourceId = draggedCardSlideId ?? event.dataTransfer.getData("text/plain"); if (sourceId) reorderSlides(sourceId, slide.id, cardDropTarget?.id === slide.id ? cardDropTarget.after : false); setDraggedCardSlideId(null); setCardDropTarget(null); }} className={`relative ${isDropBefore ? "before:absolute before:inset-x-2 before:-top-2 before:z-10 before:h-0.5 before:rounded-full before:bg-[var(--accent)]" : ""} ${isDropAfter ? "after:absolute after:inset-x-2 after:-bottom-2 after:z-10 after:h-0.5 after:rounded-full after:bg-[var(--accent)]" : ""}`}><Card variant="secondary" className={`rounded-xl border bg-[var(--surface-secondary)] p-4 shadow-none transition ${draggedCardSlideId === slide.id ? "border-[var(--accent)] opacity-50" : "border-[var(--border)]"}`}>
            <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-1"><span draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", slide.id); setDraggedCardSlideId(slide.id); }} onDragEnd={() => { setDraggedCardSlideId(null); setCardDropTarget(null); }} className="shrink-0 cursor-grab active:cursor-grabbing"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`جابه‌جایی اسلاید ${index + 1}`} className="pointer-events-none cursor-grab text-[var(--muted)] active:cursor-grabbing"><GripVertical size={16} /></Button></span><strong className="text-xs">اسلاید {(index + 1).toLocaleString("fa-IR")}</strong></div><Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف اسلاید ${index + 1}`} onPress={() => setSlides((current) => current.filter((item) => item.id !== slide.id))}><Trash2 size={14} /></Button></div>
            <div className="grid gap-3 sm:grid-cols-2"><HeroMediaField label="تصویر دسکتاپ" hint="پیشنهاد: ۱۹۲۰×۹۰۰" media={slide.desktopMedia} onSelect={() => setPickerTarget(`desktop:${slide.id}`)} onClear={() => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, desktopMedia: null } : item))} /><HeroMediaField label="تصویر موبایل" hint="اختیاری؛ ۹۰۰×۱۲۰۰" media={slide.mobileMedia} onSelect={() => setPickerTarget(`mobile:${slide.id}`)} onClear={() => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, mobileMedia: null } : item))} /></div>
            <div className="mt-3"><Field label="لینک اختصاصی اسلاید"><Input required value={slide.href} onChange={(event) => setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, href: event.target.value } : item))} dir="ltr" placeholder="/products یا https://example.com" variant="secondary" className={adminFieldClass} /></Field></div>
          </Card></div>;
          })}</div> : <Alert status="warning"><Alert.Description>هنوز اسلایدی اضافه نشده است؛ تا زمان افزودن تصویر، بنر پیش‌فرض سایت نمایش داده می‌شود.</Alert.Description></Alert>}
        </Card.Content>
      </Card>

      <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره تنظیمات هیرو</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">محتوا، ترتیب تصاویر و لینک‌های اختصاصی با هم ذخیره می‌شوند.</p></div><AdminSaveButton isSaving={saving} label="ذخیره تنظیمات هیرو" /></div></Card>
    </form>
    <MediaPickerDialog open={pickerTarget !== null} scope="HOMEPAGE" allowedTypes={["IMAGE"]} selected={selectedMedia ? [selectedMedia] : []} onClose={() => setPickerTarget(null)} onConfirm={(items) => { const media = items[0] ?? null; if (!pickerTarget) return; const id = pickerTarget.slice(pickerTarget.indexOf(":") + 1); setSlides((current) => current.map((slide) => slide.id === id ? pickerTarget.startsWith("desktop:") ? { ...slide, desktopMedia: media } : { ...slide, mobileMedia: media } : slide)); }} />
    <Modal.Backdrop isOpen={orderOpen} onOpenChange={(open) => { setOrderOpen(open); if (!open) setDraggedSlideId(null); }} variant="blur">
      <Modal.Container size="lg" placement="center" scroll="inside">
        <Modal.Dialog aria-label="ویرایش ترتیب اسلایدهای هیرو" dir="rtl" className="mx-3 max-h-[calc(100dvh-32px)] overflow-hidden bg-[var(--surface)] text-[var(--foreground)]">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5"><div><Modal.Heading className="text-base font-bold">ترتیب اسلایدها</Modal.Heading><p className="mb-0 mt-1 text-xs text-[var(--muted)]">هر اسلاید را بگیرید و در جایگاه موردنظر رها کنید.</p></div><Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)]"><X size={18} /></Modal.CloseTrigger></Modal.Header>
          <Modal.Body className="grid gap-2 p-5">{draftOrder.map((id, index) => {
            const slide = slides.find((item) => item.id === id);
            if (!slide) return null;
            return <div key={id} draggable onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); setDraggedSlideId(id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); moveDraftSlide(id, event.clientY > bounds.top + bounds.height / 2); }} onDrop={(event) => { event.preventDefault(); setDraggedSlideId(null); }} onDragEnd={() => setDraggedSlideId(null)} className={`flex cursor-grab items-center gap-3 rounded-xl border p-3 transition active:cursor-grabbing ${draggedSlideId === id ? "border-[var(--accent)] bg-[var(--accent)]/5 opacity-55" : "border-[var(--border)] bg-[var(--surface-secondary)]"}`}>
              <GripVertical size={18} className="shrink-0 text-[var(--muted)]" />
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs font-bold text-[var(--muted)]">{(index + 1).toLocaleString("fa-IR")}</span>
              <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]">{slide.desktopMedia ? <Image src={slide.desktopMedia.url} alt={slide.desktopMedia.title} fill sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--muted)]"><Images size={18} /></span>}</span>
              <span className="min-w-0 flex-1"><strong className="block text-sm">اسلاید {(index + 1).toLocaleString("fa-IR")}</strong><small className="mt-1 block truncate text-[10px] text-[var(--muted)]" dir="ltr">{slide.href}</small></span>
            </div>;
          })}</Modal.Body>
          <Modal.Footer className="flex-row justify-start gap-2 border-t border-[var(--border)] p-4"><Button type="button" variant="primary" onPress={applyOrder}>اعمال ترتیب</Button><Button type="button" variant="secondary" onPress={() => setOrderOpen(false)}>انصراف</Button></Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className={adminLabelClass}><Label className="text-xs font-bold text-[var(--muted)]">{label}</Label>{children}</div>;
}

function HeroMediaField({ label, hint, media, onSelect, onClear }: { label: string; hint: string; media: MediaChoice | null; onSelect: () => void; onClear: () => void }) {
  return <Card variant="secondary" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] shadow-none"><div className="relative aspect-[16/9] bg-[var(--surface)]">{media ? <Image src={media.url} alt={media.title} fill sizes="(max-width: 640px) 100vw, 420px" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--muted)]"><Images size={24} /></span>}</div><div className="grid min-w-0 gap-2 p-3"><div className="min-w-0"><strong className="block text-xs">{label}</strong><span className="block truncate text-[10px] text-[var(--muted)]" title={media?.title || hint}>{media?.title || hint}</span></div><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onPress={onSelect} className="flex-1 gap-1 text-xs"><Upload size={13} />{media ? "تغییر" : "انتخاب"}</Button>{media && <Button type="button" size="sm" isIconOnly variant="danger-soft" aria-label={`حذف ${label}`} onPress={onClear}><Trash2 size={13} /></Button>}</div></div></Card>;
}
