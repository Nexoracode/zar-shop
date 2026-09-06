"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { GripVertical, Trash2 } from "lucide-react";
import type { HomepageMenuLinkOption, HomepageSettings } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpTag } from "./ui";

export function BlueprintHomepageMenuSettings({ initialSettings, linkOptions }: { initialSettings: HomepageSettings; linkOptions: HomepageMenuLinkOption[] }) {
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState(initialSettings.menuItems);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customHref, setCustomHref] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function addItem(label: string, href: string) {
    const normalizedLabel = label.trim();
    const normalizedHref = href.trim();
    if (!normalizedLabel || !normalizedHref || items.length >= 20) return;
    setItems((current) => [...current, { id: crypto.randomUUID(), label: normalizedLabel, href: normalizedHref }]);
  }

  function moveItem(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuItems: items }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره منوی بالای سایت انجام نشد.");
      setItems(result.menuItems);
      toast.success("منوی بالای سایت ذخیره شد", { description: "عنوان، لینک و ترتیب آیتم‌ها در هدر فروشگاه اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره منوی بالای سایت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><BpKicker>آیتم‌های منوی بالا</BpKicker><p className="bp-muted m-0 mt-1 text-[12px] leading-6">لینک آماده انتخاب کنید یا آیتم دلخواه بسازید</p></div>
          <BpTag>{items.length.toLocaleString("fa-IR")} از ۲۰</BpTag>
        </div>

        <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
          <div className="grid gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <BpSelect label="لینک آماده" value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)} placeholder="صفحه یا دسته‌بندی" options={linkOptions.map((option) => ({ value: option.id, label: `${option.group} — ${option.label}` }))} reserveMessage={false} />
            <BpButton type="button" disabled={!selectedOptionId || items.length >= 20} onClick={() => { const option = linkOptions.find((item) => item.id === selectedOptionId); if (!option) return; addItem(option.label, option.href); setSelectedOptionId(""); }} className="gap-1.5">افزودن</BpButton>
          </div>
          <div className="grid gap-2.5 border border-dashed border-[var(--bp-divider)] p-2.5 sm:grid-cols-[minmax(120px,.7fr)_minmax(180px,1.3fr)_auto] sm:items-end">
            <BpInput label="عنوان" value={customLabel} maxLength={homepageFieldLimits.menuLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="پیشنهاد ویژه" reserveMessage={false} />
            <BpInput label="لینک" value={customHref} maxLength={homepageFieldLimits.href} onChange={(event) => setCustomHref(event.target.value)} dir="ltr" placeholder="/products" reserveMessage={false} />
            <BpButton type="button" variant="primary" disabled={!customLabel.trim() || !customHref.trim() || items.length >= 20} onClick={() => { addItem(customLabel, customHref); setCustomLabel(""); setCustomHref(""); }} className="gap-1.5">ساخت</BpButton>
          </div>
        </div>

        <div className="mt-3">
          {items.length ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onDragOver={(event) => { event.preventDefault(); moveItem(item.id); }}
                  onDrop={(event) => { event.preventDefault(); setDraggedId(null); }}
                  className={`grid gap-2 border p-2 transition sm:grid-cols-[auto_minmax(100px,.65fr)_minmax(160px,1.35fr)_auto] sm:items-end ${draggedId === item.id ? "border-[var(--bp-accent)] opacity-55" : "border-[var(--bp-divider)]"}`}
                >
                  <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(item.id); }} onDragEnd={() => setDraggedId(null)} className="bp-muted mb-1.5 grid cursor-grab place-items-center self-center"><GripVertical size={15} /></span>
                  <BpInput label={`عنوان ${(index + 1).toLocaleString("fa-IR")}`} value={item.label} maxLength={homepageFieldLimits.menuLabel} onChange={(event) => setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, label: event.target.value } : currentItem))} reserveMessage={false} />
                  <BpInput label="لینک" value={item.href} maxLength={homepageFieldLimits.href} onChange={(event) => setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, href: event.target.value } : currentItem))} dir="ltr" reserveMessage={false} />
                  <BpButton type="button" isIconOnly variant="ghost" className="mb-0.5 bp-btn-danger-icon" aria-label={`حذف ${item.label}`} onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}><Trash2 size={14} /></BpButton>
                </div>
              ))}
            </div>
          ) : <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">هنوز آیتمی برای منوی بالای سایت تعریف نشده است.</p>}
        </div>
      </section>
      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">تمام آیتم‌ها و ترتیب آن‌ها با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره منو</BpButton>
      </section>
    </form>
  );
}
