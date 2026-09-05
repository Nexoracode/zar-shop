"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import type { HomepageLayoutItemId, HomepageSectionId, HomepageSettings } from "@/modules/settings/homepage-settings";
import { BpButton, BpKicker, BpTag } from "./ui";
import { BlueprintHomepageLayoutPreview } from "./homepage-layout-preview";

const sectionMeta: Record<HomepageSectionId, { title: string; description: string }> = {
  HERO: { title: "اسلایدر اصلی", description: "بنر، عنوان، توضیح و دکمه اقدام" },
  CATEGORIES: { title: "دسته‌بندی‌های منتخب", description: "دسته‌بندی‌های دایره‌ای و فعال فروشگاه" },
  BRANDS: { title: "محبوب‌ترین برندها", description: "لوگوی برندهای منتخب برای دسترسی سریع" },
  FEATURED_PRODUCTS: { title: "پیشنهادهای شگفت‌انگیز", description: "محصولات دارای تخفیف و پیشنهاد ویژه" },
  POPULAR_PRODUCTS: { title: "محبوب‌ترین محصولات", description: "محصولاتی که بیشتر مورد توجه مشتریان هستند" },
  BEST_SELLING_PRODUCTS: { title: "پرفروش‌ترین محصولات", description: "فهرست رتبه‌بندی‌شده و فشرده محصولات پرفروش" },
  LATEST_PRODUCTS: { title: "جدیدترین محصولات", description: "تازه‌ترین محصولات منتشرشده فروشگاه" },
  ABOUT: { title: "معرفی فروشگاه", description: "داستان، ارزش‌ها و شفافیت فروشگاه" },
  PROMISES: { title: "مزیت‌های خرید", description: "ضمانت اصالت، ارسال امن و قیمت‌گذاری شفاف" },
  CONCIERGE: { title: "خدمات اختصاصی", description: "تضمین اصالت، تحویل و مشاوره انتخاب" },
};

export function BlueprintHomepageLayoutSettings({ initialSettings }: { initialSettings: HomepageSettings }) {
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

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>چینش صفحه اصلی</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">هر بخش و هر ردیف تایل را مستقل در جای دلخواه قرار دهید</p>
        <div className="mt-3 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
          <div className="grid gap-1.5">
            {sections.map((section, index) => {
              const groupId = section.id.startsWith("TILE_GROUP:") ? section.id.slice("TILE_GROUP:".length) : null;
              const groupIndex = groupId ? initialSettings.tileGroups.findIndex((group) => group.id === groupId) : -1;
              const group = groupIndex >= 0 ? initialSettings.tileGroups[groupIndex] : null;
              const meta = group ? { title: `ردیف تایل ${(groupIndex + 1).toLocaleString("fa-IR")}`, description: `${group.tiles.length.toLocaleString("fa-IR")} تایل؛ تصاویر و چیدمان از مدیریت تایل‌ها` } : sectionMeta[section.id as HomepageSectionId];
              if (!meta) return null;
              const before = dropTarget?.id === section.id && !dropTarget.after && draggedId !== section.id;
              const after = dropTarget?.id === section.id && dropTarget.after && draggedId !== section.id;
              return (
                <div
                  key={section.id}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); setDropTarget({ id: section.id, after: event.clientY > bounds.top + bounds.height / 2 }); }}
                  onDrop={(event) => dropSection(event, section.id)}
                  className={`relative flex items-center gap-2.5 border bg-[var(--bp-bg)] p-2.5 transition ${draggedId === section.id ? "border-[var(--bp-accent)] opacity-45" : "border-[var(--bp-divider)]"} ${before ? "before:absolute before:inset-x-2 before:-top-1 before:h-0.5 before:bg-[var(--bp-accent)]" : ""} ${after ? "after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:bg-[var(--bp-accent)]" : ""}`}
                >
                  <span
                    draggable
                    onDragStart={(event: DragEvent<HTMLSpanElement>) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); setDraggedId(section.id); }}
                    onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                    onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveSection(index, -1); } else if (event.key === "ArrowDown") { event.preventDefault(); moveSection(index, 1); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={`جابه‌جایی ${meta.title}`}
                    className="bp-muted shrink-0 cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical size={16} />
                  </span>
                  <span className="bp-muted grid size-7 shrink-0 place-items-center bg-[var(--bp-card)] text-[11px] font-bold">{(index + 1).toLocaleString("fa-IR")}</span>
                  <div className="min-w-0 flex-1"><strong className="block text-[13px]">{meta.title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{meta.description}</span></div>
                  <BpTag tone={section.enabled ? "success" : "neutral"}>{section.enabled ? "فعال" : "غیرفعال"}</BpTag>
                  <BpButton type="button" isIconOnly size="sm" variant="ghost" aria-label={`${section.enabled ? "غیرفعال کردن" : "فعال کردن"} ${meta.title}`} onClick={() => setSections((current) => current.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item))}>{section.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</BpButton>
                </div>
              );
            })}
          </div>
          <BlueprintHomepageLayoutPreview sections={sections} settings={initialSettings} />
        </div>
      </section>
      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">ترتیب و وضعیت همه بخش‌ها با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره چینش</BpButton>
      </section>
    </form>
  );
}
