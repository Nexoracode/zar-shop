"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { Button, Card, Chip, toast } from "@heroui/react";
import { Eye, EyeOff, GripVertical, LayoutDashboard, Save } from "lucide-react";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { HomepageLayoutPreview } from "@/components/homepage-layout-preview";
import type { HomepageLayoutItemId, HomepageSectionId, HomepageSettings } from "@/modules/settings/homepage-settings";

const sectionMeta: Record<HomepageSectionId, { title: string; description: string }> = {
  HERO: { title: "اسلایدر اصلی", description: "بنر، عنوان، توضیح و دکمه اقدام" },
  CATEGORIES: { title: "دسته‌بندی‌های منتخب", description: "دسته‌بندی‌های دایره‌ای و فعال فروشگاه" },
  FEATURED_PRODUCTS: { title: "پیشنهادهای شگفت‌انگیز", description: "محصولات دارای تخفیف و پیشنهاد ویژه" },
  POPULAR_PRODUCTS: { title: "محبوب‌ترین محصولات", description: "محصولاتی که بیشتر مورد توجه مشتریان هستند" },
  LATEST_PRODUCTS: { title: "جدیدترین محصولات", description: "تازه‌ترین محصولات منتشرشده فروشگاه" },
  ABOUT: { title: "معرفی فروشگاه", description: "داستان، ارزش‌ها و شفافیت فروشگاه" },
  PROMISES: { title: "مزیت‌های خرید", description: "ضمانت اصالت، ارسال امن و قیمت‌گذاری شفاف" },
  CONCIERGE: { title: "خدمات اختصاصی", description: "تضمین اصالت، تحویل و مشاوره انتخاب" },
};

export function HomepageLayoutSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState(initialSettings.sections);
  const [draggedId, setDraggedId] = useState<HomepageLayoutItemId | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: HomepageLayoutItemId; after: boolean } | null>(null);

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropSection(event: DragEvent<HTMLDivElement>, targetId: HomepageLayoutItemId) {
    event.preventDefault();
    const sourceId = draggedId ?? event.dataTransfer.getData("text/plain") as HomepageLayoutItemId;
    const target = dropTarget?.id === targetId ? dropTarget : { id: targetId, after: false };
    if (sourceId && sourceId !== target.id) {
      setSections((current) => {
        const source = current.find((section) => section.id === sourceId);
        if (!source) return current;
        const remaining = current.filter((section) => section.id !== sourceId);
        const targetIndex = remaining.findIndex((section) => section.id === target.id);
        if (targetIndex < 0) return current;
        remaining.splice(targetIndex + (target.after ? 1 : 0), 0, source);
        return remaining;
      });
    }
    setDraggedId(null);
    setDropTarget(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/layout", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره چینش صفحه اصلی انجام نشد.");
      toast.success("چینش صفحه اصلی ذخیره شد", { description: "ترتیب و وضعیت بخش‌ها در سایت اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره چینش صفحه اصلی انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5" dir="rtl">
    <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><LayoutDashboard size={19} /></span><div className="min-w-0"><Card.Title className="text-base font-black">چینش صفحه اصلی</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">هر بخش و هر ردیف تایل را مستقل در جای دلخواه قرار دهید</Card.Description></div><div className="mr-auto"><AdminSectionHelp title="چینش صفحه اصلی" summary="ترتیب و وضعیت تمام بخش‌ها از این صفحه مدیریت می‌شود و پیش‌نمایش هم‌زمان تغییر می‌کند." blocks={[{ title: "تغییر ترتیب", items: ["دستگیره هر ردیف را نگه دارید.", "آن را بین بخش‌های دیگر بکشید و رها کنید.", "هر بخش را مستقل فعال یا غیرفعال کنید."] }, { title: "پیش‌نمایش", description: "نمای دسکتاپ یا موبایل را انتخاب کنید تا نتیجه تقریبی چینش را پیش از ذخیره ببینید." }]} /></div></Card.Header>
      <Card.Content className="p-5"><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <div className="grid gap-2">{sections.map((section, index) => {
          const groupId = section.id.startsWith("TILE_GROUP:") ? section.id.slice("TILE_GROUP:".length) : null;
          const groupIndex = groupId ? initialSettings.tileGroups.findIndex((group) => group.id === groupId) : -1;
          const group = groupIndex >= 0 ? initialSettings.tileGroups[groupIndex] : null;
          const meta = group ? { title: `ردیف تایل ${(groupIndex + 1).toLocaleString("fa-IR")}`, description: `${group.tiles.length.toLocaleString("fa-IR")} تایل؛ تصاویر و چیدمان از مدیریت تایل‌ها` } : sectionMeta[section.id as HomepageSectionId];
          if (!meta) return null;
          const before = dropTarget?.id === section.id && !dropTarget.after && draggedId !== section.id;
          const after = dropTarget?.id === section.id && dropTarget.after && draggedId !== section.id;
          return <div key={section.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); setDropTarget({ id: section.id, after: event.clientY > bounds.top + bounds.height / 2 }); }} onDrop={(event) => dropSection(event, section.id)} className={`relative flex items-center gap-2 rounded-xl border bg-[var(--surface-secondary)] p-3 transition sm:gap-3 ${draggedId === section.id ? "border-[var(--accent)] opacity-45" : "border-[var(--border)]"} ${before ? "before:absolute before:inset-x-2 before:-top-1.5 before:h-0.5 before:rounded-full before:bg-[var(--accent)]" : ""} ${after ? "after:absolute after:inset-x-2 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-[var(--accent)]" : ""}`}>
            <span draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); setDraggedId(section.id); }} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} className="shrink-0 cursor-grab active:cursor-grabbing"><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`جابه‌جایی ${meta.title}`} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveSection(index, -1); } else if (event.key === "ArrowDown") { event.preventDefault(); moveSection(index, 1); } }} className="pointer-events-none text-[var(--muted)]"><GripVertical size={17} /></Button></span>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-xs font-black text-[var(--muted)]">{(index + 1).toLocaleString("fa-IR")}</span>
            <div className="min-w-0 flex-1"><strong className="block text-sm">{meta.title}</strong><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{meta.description}</span></div>
            <Chip size="sm" variant="soft" className={section.enabled ? "text-emerald-700" : "text-slate-500"}><Chip.Label>{section.enabled ? "فعال" : "غیرفعال"}</Chip.Label></Chip>
            <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`${section.enabled ? "غیرفعال کردن" : "فعال کردن"} ${meta.title}`} onPress={() => setSections((current) => current.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item))}>{section.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</Button>
          </div>;
        })}</div>
        <HomepageLayoutPreview sections={sections} settings={initialSettings} />
      </div></Card.Content>
    </Card>
    <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block text-sm">ذخیره چینش صفحه اصلی</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">ترتیب و وضعیت همه بخش‌ها با هم ذخیره می‌شوند.</p></div><Button type="submit" variant="primary" isPending={saving} className="min-h-11 shrink-0 gap-2 px-5"><Save size={16} />ذخیره چینش</Button></div></Card>
  </form>;
}
