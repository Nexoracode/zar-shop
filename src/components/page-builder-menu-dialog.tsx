"use client";

import { useState } from "react";
import { Button, I18nProvider, Modal, Spinner, toast } from "@heroui/react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { HeroSelectField } from "@/components/hero-select-field";
import { InlineAlert } from "@/components/inline-alert";
import { TextField } from "@/components/form-field";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import type { HomepageMenuItem, HomepageMenuLinkOption } from "@/modules/settings/homepage-settings";
import { safeHrefSchema } from "@/modules/settings/safe-href";
import { homepageFieldLimits } from "@/modules/settings/settings-limits";

type ItemErrors = Partial<Record<"label" | "href", string>>;

/**
 * The page builder's "menu" form: the links of the storefront's top menu — add (from ready links or a custom one),
 * edit, reorder and remove. It saves on its own through the homepage menu API and the page is refreshed afterwards.
 */
export function PageBuilderMenuDialog({ initialItems, linkOptions, onSaved, onClose }: { initialItems: HomepageMenuItem[]; linkOptions: HomepageMenuLinkOption[]; onSaved: () => void; onClose: () => void }) {
  const [items, setItems] = useState(initialItems);
  const [errors, setErrors] = useState<Record<string, ItemErrors>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const full = items.length >= homepageFieldLimits.menuItems;

  const fieldId = (itemId: string, field: "label" | "href") => `builder-menu-${itemId}-${field}`;

  function addItem(label: string, href: string) {
    if (full) return;
    setItems((current) => [...current, { id: crypto.randomUUID(), label, href }]);
  }

  function updateItem(id: string, patch: Partial<Pick<HomepageMenuItem, "label" | "href">>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setErrors((current) => (current[id] ? { ...current, [id]: { ...current[id], ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) } } : current));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function validate() {
    const next: Record<string, ItemErrors> = {};
    for (const item of items) {
      const itemErrors: ItemErrors = {};
      if (!item.label.trim()) itemErrors.label = "عنوان آیتم را وارد کنید.";
      const href = safeHrefSchema.safeParse(item.href);
      if (!href.success) itemErrors.href = item.href.trim() ? href.error.issues[0].message : "لینک آیتم را وارد کنید.";
      if (itemErrors.label || itemErrors.href) next[item.id] = itemErrors;
    }
    setErrors(next);
    const firstInvalid = items.find((item) => next[item.id]);
    if (firstInvalid) document.getElementById(fieldId(firstInvalid.id, next[firstInvalid.id].label ? "label" : "href"))?.focus();
    return firstInvalid === undefined;
  }

  async function submit() {
    setFormError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/homepage/menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuItems: items.map((item) => ({ id: item.id, label: item.label.trim(), href: item.href.trim() })) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره منو انجام نشد.");
      toast.success("منو ذخیره شد");
      onSaved();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "ذخیره منو انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    // react-aria places a select's list by the locale's direction, not the page's `dir`: without a Persian locale it opens
    // from the left edge of the field. The provider sits outside the modal so the portaled list inherits it.
    <I18nProvider locale="fa-IR">
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label="ویرایش منو" dir="rtl" className="mx-4 max-w-[640px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">منو</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="grid max-h-[60vh] gap-4 overflow-y-auto p-5">
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <HeroSelectField name="builder-menu-ready-link" label="افزودن لینک آماده" ariaLabel="افزودن لینک آماده" placeholder="صفحه یا دسته‌بندی" value="" disabled={full || saving} searchable options={linkOptions.map((option) => ({ value: option.id, label: `${option.group} — ${option.label}` }))} onValueChange={(id) => { const option = linkOptions.find((item) => item.id === id); if (option) addItem(option.label, option.href); }} />
              <Button type="button" variant="outline" isDisabled={full || saving} onPress={() => addItem("", "")} className="min-h-10 gap-1.5 rounded-lg px-4 text-sm font-bold"><Plus size={16} />آیتم دلخواه</Button>
            </div>
            <p className="m-0 text-xs text-[var(--muted)]">{items.length.toLocaleString("fa-IR")} از {homepageFieldLimits.menuItems.toLocaleString("fa-IR")} آیتم</p>

            {items.length === 0 && <p className="m-0 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">هنوز آیتمی برای منوی بالای سایت تعریف نشده است.</p>}
            <ul className="m-0 grid list-none gap-3 p-0">
              {items.map((item, index) => (
                <li key={item.id} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)_auto] sm:items-start">
                  <TextField id={fieldId(item.id, "label")} label={`عنوان ${(index + 1).toLocaleString("fa-IR")}`} value={item.label} maxLength={homepageFieldLimits.menuLabel} error={errors[item.id]?.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} />
                  <TextField id={fieldId(item.id, "href")} label="لینک" dir="ltr" value={item.href} maxLength={homepageFieldLimits.href} error={errors[item.id]?.href} onChange={(event) => updateItem(item.id, { href: event.target.value })} />
                  <div className="flex items-center gap-1 sm:mt-6">
                    <Button type="button" isIconOnly variant="ghost" isDisabled={index === 0 || saving} aria-label={`انتقال ${item.label || "آیتم"} به بالا`} onPress={() => moveItem(index, -1)} className="size-9 min-h-9 min-w-9"><ArrowUp size={16} /></Button>
                    <Button type="button" isIconOnly variant="ghost" isDisabled={index === items.length - 1 || saving} aria-label={`انتقال ${item.label || "آیتم"} به پایین`} onPress={() => moveItem(index, 1)} className="size-9 min-h-9 min-w-9"><ArrowDown size={16} /></Button>
                    <Button type="button" isIconOnly variant="ghost" isDisabled={saving} aria-label={`حذف ${item.label || "آیتم"}`} onPress={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} className="size-9 min-h-9 min-w-9 text-[var(--danger)]"><Trash2 size={16} /></Button>
                  </div>
                </li>
              ))}
            </ul>
            {formError && <InlineAlert status="danger" compact>{formError}</InlineAlert>}
          </Modal.Body>
          <Modal.Footer className="gap-3 border-t border-[var(--border)] p-5">
            <Button type="button" variant="primary" isPending={saving} onPress={() => void submit()} className="min-h-11 flex-[1.4] rounded-xl text-sm font-bold" style={brandPrimaryButtonStyle}>
              {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}ذخیره منو</>}
            </Button>
            <Button type="button" variant="outline" isDisabled={saving} onPress={onClose} className="min-h-11 flex-1 rounded-xl text-sm font-bold">انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
    </I18nProvider>
  );
}
