"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Card, Chip, Input, Label, toast } from "@heroui/react";
import { GripVertical, ListTree, Plus, Trash2 } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass } from "@/components/admin-ui";
import type { HomepageMenuLinkOption, HomepageSettings } from "@/modules/settings/homepage-settings";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

export function HomepageMenuSettings({ initialSettings, linkOptions }: { initialSettings: HomepageSettings; linkOptions: HomepageMenuLinkOption[] }) {
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

  return <form onSubmit={submit} className="admin-sticky-save-form grid gap-4" dir="rtl">
    <Card variant="secondary" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Card.Header className="flex-row items-center gap-3 border-b border-[var(--border)] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><ListTree size={18} /></span><div className="min-w-0"><Card.Title className="text-base font-bold">آیتم‌های منوی بالا</Card.Title><Card.Description className="mt-1 text-xs text-[var(--muted)]">لینک آماده انتخاب کنید یا آیتم دلخواه بسازید</Card.Description></div><Chip size="sm" variant="soft" className="mr-auto text-[var(--accent)]"><Chip.Label>{items.length.toLocaleString("fa-IR")} از ۲۰</Chip.Label></Chip><AdminSectionHelp title="مدیریت منوی بالا" summary="این آیتم‌ها مستقل از دسته‌بندی کالاها و در کنار منوی دسته‌بندی نمایش داده می‌شوند." blocks={[{ title: "افزودن", items: ["از لینک‌های آماده یک صفحه یا دسته‌بندی را انتخاب کنید.", "برای مقصد دلخواه، عنوان و لینک سفارشی بسازید."] }, { title: "ترتیب", description: "آیتم‌ها را با دستگیره جابه‌جا کنید؛ ترتیب این فهرست همان ترتیب هدر سایت است." }]} /></Card.Header>
      <Card.Content className="grid gap-4 p-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <HeroSelectField name="menu-link-preset" label="لینک آماده" value={selectedOptionId} onValueChange={setSelectedOptionId} placeholder="صفحه یا دسته‌بندی" options={linkOptions.map((option) => ({ value: option.id, label: `${option.group} — ${option.label}` }))} />
            <Button type="button" variant="secondary" isDisabled={!selectedOptionId || items.length >= 20} onPress={() => { const option = linkOptions.find((item) => item.id === selectedOptionId); if (!option) return; addItem(option.label, option.href); setSelectedOptionId(""); }} className="min-h-10 gap-1.5 text-xs"><Plus size={14} />افزودن</Button>
          </div>
          <div className="grid gap-3 rounded-xl border border-dashed border-[var(--border)] p-3 sm:grid-cols-[minmax(120px,.7fr)_minmax(180px,1.3fr)_auto] sm:items-end">
            <MenuField label="عنوان"><Input value={customLabel} maxLength={homepageFieldLimits.menuLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="پیشنهاد ویژه" variant="secondary" className={adminFieldClass} /></MenuField>
            <MenuField label="لینک"><Input value={customHref} maxLength={homepageFieldLimits.href} onChange={(event) => setCustomHref(event.target.value)} dir="ltr" placeholder="/products" variant="secondary" className={adminFieldClass} /></MenuField>
            <Button type="button" variant="primary" isDisabled={!customLabel.trim() || !customHref.trim() || items.length >= 20} onPress={() => { addItem(customLabel, customHref); setCustomLabel(""); setCustomHref(""); }} className="min-h-10 gap-1.5 text-xs"><Plus size={14} />ساخت</Button>
          </div>
        </div>

        {items.length ? <div className="grid gap-2 lg:grid-cols-2">{items.map((item, index) => <Card key={item.id} variant="secondary" onDragOver={(event) => { event.preventDefault(); moveItem(item.id); }} onDrop={(event) => { event.preventDefault(); setDraggedId(null); }} className={`grid gap-2 rounded-xl border p-2.5 transition sm:grid-cols-[auto_minmax(100px,.65fr)_minmax(160px,1.35fr)_auto] sm:items-end ${draggedId === item.id ? "border-[var(--accent)] opacity-55" : "border-[var(--border)]"}`}>
          <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedId(item.id); }} onDragEnd={() => setDraggedId(null)} className="self-center cursor-grab"><Button type="button" isIconOnly size="sm" variant="ghost" className="pointer-events-none text-[var(--muted)]" aria-label={`جابه‌جایی آیتم ${(index + 1).toLocaleString("fa-IR")}`}><GripVertical size={15} /></Button></span>
          <MenuField label={`عنوان ${(index + 1).toLocaleString("fa-IR")}`}><Input value={item.label} maxLength={homepageFieldLimits.menuLabel} onChange={(event) => setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, label: event.target.value } : currentItem))} variant="secondary" className={adminFieldClass} /></MenuField>
          <MenuField label="لینک"><Input value={item.href} maxLength={homepageFieldLimits.href} onChange={(event) => setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, href: event.target.value } : currentItem))} dir="ltr" variant="secondary" className={adminFieldClass} /></MenuField>
          <Button type="button" isIconOnly size="sm" variant="danger-soft" aria-label={`حذف ${item.label}`} onPress={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} className="mb-0.5"><Trash2 size={14} /></Button>
        </Card>)}</div> : <Alert status="warning"><Alert.Description>هنوز آیتمی برای منوی بالای سایت تعریف نشده است.</Alert.Description></Alert>}
      </Card.Content>
    </Card>
    <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"><div className="flex items-center justify-between gap-3"><div><strong className="block text-sm">ذخیره منوی بالای سایت</strong><p className="m-0 mt-1 text-xs text-[var(--muted)]">تمام آیتم‌ها و ترتیب آن‌ها با هم ذخیره می‌شوند.</p></div><AdminSaveButton isSaving={saving} label="ذخیره منو" /></div></Card>
  </form>;
}

function MenuField({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{label}</Label>{children}</div>;
}
